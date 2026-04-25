import { db } from './firebase.config';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  limit,
} from 'firebase/firestore';

const slugify = (value = '') =>
  value
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);

const addDays = (isoDate, days) => {
  const date = new Date(isoDate);
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

const getDefaultBrandName = (email = '') => {
  const prefix = (email.split('@')[0] || 'Mi').replace(/[._-]+/g, ' ').trim();
  return `${prefix.charAt(0).toUpperCase()}${prefix.slice(1)} Store`;
};

const generateUniqueSubdomain = async (baseValue) => {
  const base = slugify(baseValue) || `tienda-${Date.now().toString().slice(-6)}`;
  let candidate = base;
  let idx = 1;

  while (idx < 50) {
    const snap = await getDocs(query(collection(db, 'stores'), where('subdomain', '==', candidate), limit(1)));
    if (snap.empty) return candidate;
    candidate = `${base}-${idx}`;
    idx += 1;
  }

  return `${base}-${Date.now().toString().slice(-5)}`;
};

export const activateSubscriptionFromOrder = async ({ orderId, orderData }) => {
  const subscriptionItem = (orderData.items || []).find((item) => item.isSubscription && item.planId);
  if (!subscriptionItem) return null;

  const userId = orderData.userId;
  const userEmail = orderData.userEmail || 'cliente@duodreams.com';
  if (!userId) return null;

  const planRef = doc(db, 'plans', subscriptionItem.planId);
  const planSnap = await getDoc(planRef);
  if (!planSnap.exists()) return null;

  const plan = { id: planSnap.id, ...planSnap.data() };
  const now = new Date().toISOString();
  const durationDays = Number(plan.billingDays || 30);

  const subscriptionRef = doc(db, 'subscriptions', userId);
  const existingSubscriptionSnap = await getDoc(subscriptionRef);
  const existing = existingSubscriptionSnap.exists() ? existingSubscriptionSnap.data() : null;

  const storeId = existing?.storeId || `store_${userId}`;
  const brandName = existing?.storeName || getDefaultBrandName(userEmail);
  const subdomain = existing?.subdomain || await generateUniqueSubdomain(userEmail.split('@')[0]);

  const modules = plan.modules || {};

  const subscriptionPayload = {
    storeId,
    storeName: brandName,
    subdomain,
    ownerUserId: userId,
    email: userEmail,
    planId: plan.id,
    planName: plan.name,
    status: 'active',
    startedAt: now,
    trialEndsAt: Number(plan.trialDays || 0) > 0 ? addDays(now, Number(plan.trialDays || 0)) : null,
    nextBillingDate: addDays(now, durationDays),
    modules,
    maxProducts: Number(plan.maxProducts ?? 0),
    maxAdmins: Number(plan.maxAdmins ?? 1),
    sourceOrderId: orderId,
    updatedAt: now,
    ...(existing ? {} : { createdAt: now }),
  };

  await setDoc(subscriptionRef, subscriptionPayload, { merge: true });

  await setDoc(doc(db, 'stores', storeId), {
    id: storeId,
    ownerUserId: userId,
    ownerEmail: userEmail,
    brandName,
    subdomain,
    planId: plan.id,
    planName: plan.name,
    modules,
    isActive: true,
    sourceOrderId: orderId,
    updatedAt: now,
    createdAt: existing?.createdAt || now,
  }, { merge: true });

  await setDoc(doc(db, 'store_settings', storeId), {
    brandName,
    logoUrl: '',
    primaryColor: '#B76E79',
    supportEmail: userEmail,
    updatedAt: now,
    createdAt: existing?.createdAt || now,
  }, { merge: true });

  return { storeId, subdomain, brandName, planId: plan.id };
};
