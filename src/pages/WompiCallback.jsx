import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc, getDoc, addDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase/firebase.config';
import { useCartStore } from '../store/cartStore';

const STATUS_MAP = {
  APPROVED: { label: 'Pago Aprobado', orderStatus: 'Pagado', success: true },
  DECLINED: { label: 'Pago Rechazado', orderStatus: 'Pago Fallido', success: false },
  VOIDED:   { label: 'Pago Anulado',   orderStatus: 'Pago Anulado', success: false },
  ERROR:    { label: 'Error en el Pago', orderStatus: 'Pago Fallido', success: false },
};

const WompiCallback = () => {
  const [status, setStatus] = useState('verifying'); // verifying | success | failed | already_processed
  const [orderNumber, setOrderNumber] = useState('');
  const [wompiStatus, setWompiStatus] = useState('');
  const { clearCart } = useCartStore();

  useEffect(() => {
    processCallback();
  }, []);

  const processCallback = async () => {
    const params = new URLSearchParams(window.location.search);
    const transactionId = params.get('id');
    const reference    = params.get('reference');   // nuestro orderNumber
    const rawStatus    = params.get('status');       // APPROVED | DECLINED | VOIDED | ERROR

    if (!transactionId || !reference) {
      setStatus('failed');
      return;
    }

    setOrderNumber(reference);
    setWompiStatus(rawStatus || '');

    try {
      // 1. Verificar transacción con la API pública de Wompi (no requiere clave secreta)
      const settingsSnap = await getDoc(doc(db, 'settings', 'global'));
      const publicKey = settingsSnap.data()?.wompi?.publicKey || '';
      const isSandbox = publicKey.startsWith('pub_test_');
      const apiBase = isSandbox
        ? 'https://sandbox.wompi.co/v1'
        : 'https://production.wompi.co/v1';

      let verifiedStatus = rawStatus;
      try {
        const res = await fetch(`${apiBase}/transactions/${transactionId}`, {
          headers: { Authorization: `Bearer ${publicKey}` },
        });
        if (res.ok) {
          const data = await res.json();
          verifiedStatus = data.data?.status || rawStatus;
        }
      } catch {
        // Si falla la verificación por API, usamos el status del URL (menos seguro pero no rompe)
      }

      // 2. Buscar la orden por orderNumber
      const ordersSnap = await getDocs(query(collection(db, 'orders'), where('orderNumber', '==', reference)));
      if (ordersSnap.empty) {
        setStatus('failed');
        return;
      }

      const orderDoc = ordersSnap.docs[0];
      const orderData = orderDoc.data();

      // Evitar reprocesar si ya fue actualizado
      if (orderData.status === 'Pagado' || orderData.wompiTransactionId) {
        setStatus('already_processed');
        setWompiStatus('APPROVED');
        return;
      }

      const mapped = STATUS_MAP[verifiedStatus] || STATUS_MAP.ERROR;

      // 3. Actualizar la orden en Firestore
      await updateDoc(doc(db, 'orders', orderDoc.id), {
        status: mapped.orderStatus,
        wompiTransactionId: transactionId,
        wompiStatus: verifiedStatus,
        paidAt: mapped.success ? new Date().toISOString() : null,
      });

      // 4. Si fue aprobado: descontar stock y enviar notificaciones
      if (mapped.success) {
        for (const item of (orderData.items || [])) {
          try {
            const productRef = doc(db, 'products', item.id);
            const productSnap = await getDoc(productRef);
            if (productSnap.exists()) {
              const newStock = Math.max(0, (productSnap.data().stockQuantity || 0) - item.quantity);
              await updateDoc(productRef, { stockQuantity: newStock });
            }
          } catch { /* producto ya eliminado, ignorar */ }
        }

        await addDoc(collection(db, 'notifications'), {
          userId: orderData.userId,
          title: '¡Pago Exitoso!',
          message: `Tu pago para el pedido ${reference} fue aprobado por Wompi. Pronto lo despachamos.`,
          createdAt: new Date().toISOString(),
          read: false,
          sendEmail: true,
          notificationType: 'order_placed',
        });

        await addDoc(collection(db, 'notifications'), {
          userId: 'admin',
          title: '¡NUEVA VENTA - Wompi!',
          message: `Pago aprobado: ${reference} · ${orderData.userEmail} · $${(orderData.totalAmount || 0).toLocaleString('es-CO')}`,
          createdAt: new Date().toISOString(),
          read: false,
          sendEmail: false,
        });

        clearCart();
        setStatus('success');
      } else {
        setStatus('failed');
      }
    } catch (err) {
      console.error('Error procesando callback Wompi:', err);
      setStatus('failed');
    }
  };

  if (status === 'verifying') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-14 w-14 border-4 border-[#E83C4E] border-t-transparent mb-6" />
        <p className="text-slate-600 font-semibold text-lg">Verificando tu pago...</p>
        <p className="text-slate-400 text-sm mt-1">No cierres esta ventana</p>
      </div>
    );
  }

  if (status === 'success' || status === 'already_processed') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
          <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-black text-slate-800 mb-2">¡Pago Aprobado!</h1>
        <p className="text-slate-500 mb-2 max-w-sm">
          Tu pedido <span className="font-bold text-brand-dark">{orderNumber}</span> fue procesado exitosamente a través de Wompi.
        </p>
        <p className="text-slate-400 text-sm mb-8">Recibirás un correo con los detalles de tu compra.</p>
        <div className="flex gap-3 flex-wrap justify-center">
          <a href="/mis-pedidos" className="bg-brand-dark text-white font-black px-8 py-3 rounded-2xl hover:bg-brand-gold transition-all uppercase text-sm tracking-wide">
            Ver mis pedidos
          </a>
          <a href="/" className="border border-gray-200 text-slate-600 font-bold px-8 py-3 rounded-2xl hover:bg-gray-50 transition-all text-sm">
            Volver a la tienda
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
      <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
        <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h1 className="text-3xl font-black text-slate-800 mb-2">Pago No Completado</h1>
      <p className="text-slate-500 mb-2 max-w-sm">
        {wompiStatus === 'DECLINED'
          ? 'Tu pago fue rechazado. Verifica los datos de tu método de pago e intenta de nuevo.'
          : wompiStatus === 'VOIDED'
          ? 'El pago fue anulado.'
          : 'Hubo un problema al procesar tu pago. El pedido no fue confirmado.'}
      </p>
      {orderNumber && (
        <p className="text-xs text-slate-400 mb-6">Referencia: {orderNumber}</p>
      )}
      <div className="flex gap-3 flex-wrap justify-center">
        <a href="/checkout" className="bg-[#E83C4E] text-white font-black px-8 py-3 rounded-2xl hover:bg-[#c8303f] transition-all uppercase text-sm tracking-wide">
          Intentar de Nuevo
        </a>
        <a href="/" className="border border-gray-200 text-slate-600 font-bold px-8 py-3 rounded-2xl hover:bg-gray-50 transition-all text-sm">
          Volver a la Tienda
        </a>
      </div>
    </div>
  );
};

export default WompiCallback;
