import { setGlobalOptions } from "firebase-functions";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";
import * as crypto from "crypto";

const wompiIntegritySecret = defineSecret("WOMPI_INTEGRITY_SECRET");

setGlobalOptions({ maxInstances: 10 });

admin.initializeApp();

const TYPE_TO_SETTING_KEY: Record<string, string> = {
  order_placed: "onOrderPlaced",
  payment_confirmed: "onPaymentConfirmed",
  dispatched: "onDispatched",
  invoiced: "onInvoiced",
  delivered: "onDelivered",
  cancelled: "onCancelled",
};

function buildEmailHtml(title: string, message: string, appUrl: string): string {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${title}</title>
    </head>
    <body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
              <tr>
                <td style="background-color:#1a1a2e;padding:28px 40px;text-align:center;">
                  <h1 style="color:#c8a96e;margin:0;font-size:24px;letter-spacing:2px;">DUO DREAMS</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:36px 40px;">
                  <h2 style="color:#1a1a2e;margin:0 0 16px;font-size:20px;">${title}</h2>
                  <p style="color:#555555;font-size:15px;line-height:1.6;margin:0 0 28px;">${message}</p>
                  <a href="${appUrl}" style="display:inline-block;background-color:#c8a96e;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:bold;">
                    Ver en la app
                  </a>
                </td>
              </tr>
              <tr>
                <td style="background-color:#f9f9f9;padding:20px 40px;text-align:center;border-top:1px solid #eeeeee;">
                  <p style="color:#aaaaaa;font-size:12px;margin:0;">
                    Este es un mensaje automático de Duo Dreams. Por favor no respondas a este correo.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// ── Email on new notification ──────────────────────────────────────────────────
export const sendEmailOnNotification = onDocumentCreated(
  "notifications/{notifId}",
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const { userId, title, message, sendEmail, notificationType } = data as {
      userId: string;
      title: string;
      message: string;
      sendEmail?: boolean;
      notificationType?: string;
    };

    if (userId === "admin" || sendEmail === false) return;

    const settingsSnap = await admin.firestore().doc("settings/global").get();
    if (!settingsSnap.exists) return;

    const settings = settingsSnap.data() as {
      emailConfig?: { user?: string; pass?: string };
      emailNotifications?: Record<string, boolean>;
    };

    const emailUser = settings.emailConfig?.user;
    const emailPass = settings.emailConfig?.pass;
    if (!emailUser || !emailPass) return;

    if (notificationType) {
      const settingKey = TYPE_TO_SETTING_KEY[notificationType];
      const isEnabled = settingKey
        ? (settings.emailNotifications?.[settingKey] ?? true)
        : false;
      if (!isEnabled) return;
    }

    let userEmail: string | undefined;
    try {
      userEmail = (await admin.auth().getUser(userId)).email;
    } catch {
      return;
    }
    if (!userEmail) return;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: emailUser, pass: emailPass },
    });

    await transporter.sendMail({
      from: `"Duo Dreams" <${emailUser}>`,
      to: userEmail,
      subject: title,
      html: buildEmailHtml(title, message, "https://duo-dreams.web.app"),
    });
  }
);

// ── Wompi: genera firma de integridad ─────────────────────────────────────────
export const generateWompiSignature = onCall(
  { secrets: [wompiIntegritySecret] },
  async (request) => {
    const { reference, amountInCents, currency } = request.data as {
      reference: string;
      amountInCents: number;
      currency: string;
    };

    if (!reference || !amountInCents || !currency) {
      throw new HttpsError("invalid-argument", "Faltan parámetros: reference, amountInCents, currency");
    }

    const secret = wompiIntegritySecret.value();
    if (!secret) {
      throw new HttpsError("internal", "Clave de integridad Wompi no configurada. Usa: firebase functions:secrets:set WOMPI_INTEGRITY_SECRET");
    }

    const hash = crypto
      .createHash("sha256")
      .update(`${reference}${amountInCents}${currency}${secret}`)
      .digest("hex");

    return { signature: hash };
  }
);

// ── Delete users (Auth + Firestore) ───────────────────────────────────────────
export const deleteUsers = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }

  const callerSnap = await admin
    .firestore()
    .doc(`users/${request.auth.uid}`)
    .get();
  const callerRole = callerSnap.data()?.role;
  const callerEmail = request.auth.token.email ?? "";
  const MASTER = "raulpte0211@gmail.com";

  if (callerRole !== "admin" && callerEmail !== MASTER) {
    throw new HttpsError("permission-denied", "Solo administradores.");
  }

  const { userIds } = request.data as { userIds: string[] };
  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw new HttpsError("invalid-argument", "userIds debe ser un array no vacío.");
  }

  const results: { uid: string; ok: boolean; error?: string }[] = [];

  for (const uid of userIds) {
    const errors: string[] = [];

    // Auth deletion — independently, failure is non-blocking
    try {
      await admin.auth().deleteUser(uid);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      // user-not-found means it's already gone from Auth — acceptable
      if (code !== "auth/user-not-found") {
        errors.push(`Auth: ${String(err)}`);
      }
    }

    // Firestore deletion — always attempted regardless of Auth result
    let firestoreOk = false;
    try {
      await admin.firestore().doc(`users/${uid}`).delete();
      firestoreOk = true;
    } catch (err) {
      errors.push(`Firestore: ${String(err)}`);
    }

    results.push({ uid, ok: firestoreOk, error: errors.join("; ") || undefined });
  }

  return { results };
});
