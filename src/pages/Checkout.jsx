import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase/firebase.config.js';
import { useUserStore } from '../store/userStore';
import { useCartStore } from '../store/cartStore';
import { useSettingsStore } from '../store/settingsStore';
import MainLayout from '../components/templates/MainLayout';
import Button from '../components/atoms/Button';
import Input from '../components/atoms/Input';

const COLOMBIA_DATA = {
  "Antioquia": ["Medellín", "Envigado", "Itagüí", "Bello", "Rionegro", "Sabaneta"],
  "Bogotá D.C.": ["Bogotá"],
  "Valle del Cauca": ["Cali", "Palmira", "Buenaventura", "Tuluá", "Buga"],
  "Atlántico": ["Barranquilla", "Soledad", "Malambo", "Puerto Colombia"],
  "Santander": ["Bucaramanga", "Floridablanca", "Girón", "Piedecuesta", "Barrancabermeja"],
  "Bolívar": ["Cartagena", "Turbaco", "Magangué"],
  "Cundinamarca": ["Soacha", "Chía", "Zipaquirá", "Facatativá", "Fusagasugá"],
  "Risaralda": ["Pereira", "Dosquebradas"],
  "Caldas": ["Manizales"],
  "Quindío": ["Armenia"]
};

const Checkout = () => {
  const { currentUser } = useUserStore();
  const { items, totalAmount, clearCart, itemCount } = useCartStore();
  const { settings, fetchSettings } = useSettingsStore();
  
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  
  // Lógica de Envío
  const [isSameAddress, setIsSameAddress] = useState(true);
  const [shippingInfo, setShippingInfo] = useState({
    recipientName: '',
    recipientPhone: '',
    department: 'Antioquia',
    city: 'Medellín',
    address: '',
    notes: ''
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(false);

  // Effect 1: fetch settings + payment methods once on mount
  useEffect(() => {
    fetchSettings();
    const fetchPMs = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "payment_methods"));
        const methods = [];
        querySnapshot.forEach((d) => methods.push({ id: d.id, ...d.data() }));
        methods.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
        setPaymentMethods(methods);
      } catch (error) {
        console.error("Error fetching payment methods:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPMs();
  }, []);

  // Effect 2: pre-fill shipping info from user profile
  useEffect(() => {
    if (currentUser && isSameAddress) {
      setShippingInfo(prev => ({
        ...prev,
        recipientName: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim(),
        recipientPhone: currentUser.phone || '',
        department: currentUser.department || 'Antioquia',
        city: currentUser.city || 'Medellín',
        address: currentUser.address || ''
      }));
    } else if (!isSameAddress) {
      setShippingInfo({ recipientName: '', recipientPhone: '', department: 'Antioquia', city: 'Medellín', address: '', notes: '' });
    }
  }, [currentUser, isSameAddress]);

  // Derive visible methods (respects admin toggles) — sets initial selection once
  const visibleMethods = useMemo(
    () => paymentMethods.filter(m => settings.paymentMethods?.[m.id] !== false),
    [paymentMethods, settings.paymentMethods]
  );

  useEffect(() => {
    if (visibleMethods.length > 0 && !selectedPaymentMethod) {
      setSelectedPaymentMethod(visibleMethods[0].id);
    }
  }, [visibleMethods]);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setShippingInfo(prev => ({ ...prev, [id]: value }));
  };

  const handleWompiPayment = async () => {
    if (!shippingInfo.recipientName || !shippingInfo.address) {
      alert('Completa la información de envío antes de continuar.');
      return;
    }

    setIsConfirming(true);
    try {
      const isBackorder = items.some(item => item.isBackorder);
      const totalWithShipping = totalAmount + (settings.shippingOnDelivery ? 0 : (settings.shippingCost || 0));
      const orderNumber = `ORD-${Date.now().toString().slice(-8)}`;
      const amountInCents = Math.round(totalWithShipping * 100);

      // 1. Guardar orden con estado pendiente ANTES de redirigir
      await addDoc(collection(db, 'orders'), {
        orderNumber,
        userId: currentUser.uid,
        userEmail: currentUser.email,
        items: items.map(item => ({
          id: item.product.id,
          name: item.product.name,
          price: item.product.price,
          cost: item.product.cost || (item.product.price * 0.6),
          quantity: item.quantity,
          category: item.product.category,
          isBackorder: !!item.isBackorder,
          ...(item.sizeInfo ? { size: item.sizeInfo.size, gender: item.sizeInfo.gender } : {}),
        })),
        subtotal: totalAmount,
        shippingCost: settings.shippingOnDelivery ? 0 : (settings.shippingCost || 0),
        shippingOnDelivery: !!settings.shippingOnDelivery,
        totalAmount: totalWithShipping,
        shippingInfo,
        paymentMethod: 'wompi',
        paymentProvider: 'wompi',
        status: isBackorder ? 'Validación de Encargo' : 'Pendiente de Pago',
        isBackorder,
        createdAt: new Date().toISOString(),
      });

      // 2. Obtener firma de integridad desde Firebase Function
      const generateSig = httpsCallable(functions, 'generateWompiSignature');
      const sigResult = await generateSig({ reference: orderNumber, amountInCents, currency: 'COP' });
      const { signature } = sigResult.data;

      // 3. Redirigir a Wompi Checkout
      const publicKey = settings.wompi?.publicKey || '';
      const redirectUrl = `${window.location.origin}/wompi-callback`;
      const wompiUrl = new URL('https://checkout.wompi.co/p/');
      wompiUrl.searchParams.set('public-key', publicKey);
      wompiUrl.searchParams.set('currency', 'COP');
      wompiUrl.searchParams.set('amount-in-cents', String(amountInCents));
      wompiUrl.searchParams.set('reference', orderNumber);
      wompiUrl.searchParams.set('signature:integrity', signature);
      wompiUrl.searchParams.set('redirect-url', redirectUrl);

      window.location.href = wompiUrl.toString();
    } catch (error) {
      console.error('Error iniciando pago Wompi:', error);
      alert('Error al iniciar el pago. Intenta nuevamente.');
      setIsConfirming(false);
    }
  };

  const handleConfirmOrder = async () => {
    if (items.length === 0) return;
    if (selectedPaymentMethod === 'transferencia' && !shippingInfo.receiptUrl) {
      alert('Por favor ingresa el URL o número del comprobante de pago.');
      return;
    }

    setIsConfirming(true);
    try {
      const isBackorder = items.some(item => item.isBackorder);
      const totalWithShipping = totalAmount + (settings.shippingOnDelivery ? 0 : (settings.shippingCost || 0));
      
      // Determinar estado inicial y si descuenta stock de una vez
      const isInstantPayment = selectedPaymentMethod === 'pse' || selectedPaymentMethod === 'card';
      const initialStatus = isBackorder ? 'Validación de Encargo' : (isInstantPayment ? 'Pagado' : 'Validación de Pago');

      const orderNumber = `ORD-${Date.now().toString().slice(-8)}`;

      const orderData = {
        orderNumber,
        userId: currentUser.uid,
        userEmail: currentUser.email,
        items: items.map(item => ({
          id: item.product.id,
          name: item.product.name,
          price: item.product.price,
          cost: item.product.cost || (item.product.price * 0.6),
          quantity: item.quantity,
          category: item.product.category,
          isBackorder: !!item.isBackorder,
          ...(item.sizeInfo ? { size: item.sizeInfo.size, gender: item.sizeInfo.gender } : {}),
        })),
        subtotal: totalAmount,
        shippingCost: settings.shippingOnDelivery ? 0 : (settings.shippingCost || 0),
        shippingOnDelivery: !!settings.shippingOnDelivery,
        totalAmount: totalWithShipping,
        shippingInfo,
        paymentMethod: selectedPaymentMethod,
        receiptUrl: shippingInfo.receiptUrl || '', 
        status: initialStatus,
        isBackorder: isBackorder,
        createdAt: new Date().toISOString()
      };

      // 1. Guardar el pedido en Firestore
      await addDoc(collection(db, 'orders'), orderData);

      // 2. Lógica condicionada al tipo de pago (Notificaciones Internas)
      if (isInstantPayment) {
        // DESCONTAR STOCK INMEDIATAMENTE
        for (const item of items) {
          const productRef = doc(db, 'products', item.product.id);
          const productSnap = await getDoc(productRef);
          if (productSnap.exists()) {
            const newStock = Math.max(0, (productSnap.data().stockQuantity || 0) - item.quantity);
            await updateDoc(productRef, { stockQuantity: newStock });
          }
        }

        // Notificar al cliente
        await addDoc(collection(db, 'notifications'), {
          userId: currentUser.uid,
          title: '¡Pago Exitoso! 💳',
          message: `Tu pago para el pedido ${orderNumber} fue procesado correctamente.`,
          createdAt: new Date().toISOString(),
          read: false,
          sendEmail: true,
          notificationType: 'order_placed'
        });

        // Notificar al admin
        await addDoc(collection(db, 'notifications'), {
          userId: 'admin',
          title: '¡NUEVA VENTA! 💰',
          message: `El cliente ${currentUser.email} compró el pedido ${orderNumber} por PSE.`,
          createdAt: new Date().toISOString(),
          read: false,
          sendEmail: false
        });
      } else {
        // Notificación de espera para el cliente
        await addDoc(collection(db, 'notifications'), {
          userId: currentUser.uid,
          title: 'Pedido en Validación ⏳',
          message: `Recibimos tu pedido ${orderNumber}. Estamos validando el comprobante de pago.`,
          createdAt: new Date().toISOString(),
          read: false,
          sendEmail: true,
          notificationType: 'order_placed'
        });

        // Notificar al admin sobre validación pendiente
        await addDoc(collection(db, 'notifications'), {
          userId: 'admin',
          title: 'Validación Pendiente 📝',
          message: `Nueva transferencia a validar del pedido ${orderNumber} (${currentUser.email}).`,
          createdAt: new Date().toISOString(),
          read: false,
          sendEmail: false
        });
      }

      // 4. Limpiar carrito y confirmar
      clearCart();
      setOrderConfirmed(true);
    } catch (error) {
      console.error("Error al procesar el pedido:", error);
      alert("Hubo un error al procesar tu pedido.");
    } finally {
      setIsConfirming(false);
    }
  };

  if (!currentUser) {
    return (
      <MainLayout cartItemCount={itemCount}>
        <div className="flex flex-col items-center justify-center py-20">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Inicia sesión para continuar</h2>
          <p className="text-slate-500 mb-8 text-center">Debes estar registrado para poder realizar una compra.</p>
          <Button onClick={() => window.location.href = '/registro'}>
            Ir al Registro / Login
          </Button>
        </div>
      </MainLayout>
    );
  }

  if (orderConfirmed) {
    return (
      <MainLayout cartItemCount={0}>
        <div className="flex flex-col items-center justify-center py-20 animate-fade-in text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">¡Pedido Confirmado!</h2>
          <p className="text-slate-500 mb-8 max-w-md">
            Tu pedido ha sido procesado exitosamente. Recibirás un correo con los detalles de tu compra en unos minutos.
          </p>
          <Button onClick={() => window.location.href = '/'}>
            Volver a la Tienda
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout cartItemCount={itemCount}>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 mb-8">Revisión de tu Pedido</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lado Izquierdo: Información y Pago */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Información de Envío */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800 flex items-center">
                  <span className="w-8 h-8 bg-brand-gold/10 text-brand-gold rounded-full flex items-center justify-center mr-3 text-sm">1</span>
                  Información de Envío
                </h2>
                
                {/* Toggle de Dirección */}
                <label className="flex items-center cursor-pointer gap-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                  <input 
                    type="checkbox" 
                    checked={isSameAddress}
                    onChange={(e) => setIsSameAddress(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="relative w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-gold"></div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Usar mis datos</span>
                </label>
              </div>

              <div className="space-y-6">
                {/* Datos del Destinatario (Solo si no es la misma dirección o siempre para confirmar) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input 
                    id="recipientName"
                    label="¿Quién recibe?"
                    value={shippingInfo.recipientName}
                    onChange={handleInputChange}
                    placeholder="Nombre completo"
                    disabled={isSameAddress}
                    required
                  />
                  <Input 
                    id="recipientPhone"
                    label="Teléfono de contacto"
                    value={shippingInfo.recipientPhone}
                    onChange={handleInputChange}
                    placeholder="Ej: 300 000 0000"
                    disabled={isSameAddress}
                    required
                  />
                </div>

                {!isSameAddress && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Departamento</label>
                      <select
                        value={shippingInfo.department}
                        onChange={(e) => {
                          const dept = e.target.value;
                          setShippingInfo(prev => ({ 
                            ...prev, 
                            department: dept, 
                            city: COLOMBIA_DATA[dept][0] 
                          }));
                        }}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:border-brand-gold"
                      >
                        {Object.keys(COLOMBIA_DATA).map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Ciudad</label>
                      <select
                        value={shippingInfo.city}
                        onChange={(e) => setShippingInfo(prev => ({ ...prev, city: e.target.value }))}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:border-brand-gold"
                      >
                        {COLOMBIA_DATA[shippingInfo.department].map(city => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <Input 
                  id="address"
                  label="Dirección Exacta"
                  value={shippingInfo.address}
                  onChange={handleInputChange}
                  placeholder="Ej: Calle 10 # 5-20, Vereda..."
                  disabled={isSameAddress}
                  required
                />

                <Input 
                  id="notes"
                  label="Indicaciones para el repartidor (Opcional)"
                  value={shippingInfo.notes}
                  onChange={handleInputChange}
                  placeholder="Ej: Portería, Apto 301, Casa blanca..."
                />
              </div>
            </section>

            {/* Método de Pago */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
                <span className="w-8 h-8 bg-brand-gold/10 text-brand-gold rounded-full flex items-center justify-center mr-3 text-sm">2</span>
                Método de Pago
              </h2>
              {isLoading ? (
                <div className="animate-pulse flex space-y-4 flex-col">
                  <div className="h-12 bg-gray-100 rounded-xl"></div>
                  <div className="h-12 bg-gray-100 rounded-xl"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Wompi: aparece primero si está habilitado */}
                  {settings.wompi?.enabled && settings.wompi?.publicKey && (
                    <div
                      onClick={() => setSelectedPaymentMethod('wompi')}
                      className={`relative flex items-center justify-between p-5 border-2 rounded-2xl cursor-pointer transition-all duration-300 ${
                        selectedPaymentMethod === 'wompi' ? 'border-[#E83C4E] bg-red-50/40 shadow-md' : 'border-gray-100 hover:border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white rounded-xl shadow-sm flex items-center justify-center p-2 border border-gray-100 shrink-0">
                          <svg viewBox="0 0 80 28" className="w-full" fill="none">
                            <text x="0" y="22" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="22" fill="#E83C4E">wompi</text>
                          </svg>
                        </div>
                        <div>
                          <span className="block font-black text-slate-800 text-sm">Pagar en línea</span>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {['Tarjeta', 'PSE', 'Nequi', 'Efectivo'].map(m => (
                              <span key={m} className="text-[9px] bg-gray-100 text-slate-500 font-bold px-1.5 py-0.5 rounded">{m}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${selectedPaymentMethod === 'wompi' ? 'border-[#E83C4E] bg-[#E83C4E]' : 'border-gray-200'}`}>
                        {selectedPaymentMethod === 'wompi' && (
                          <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      {selectedPaymentMethod === 'wompi' && (
                        <div className="absolute -top-3 -right-2 bg-[#E83C4E] text-white text-[8px] font-black px-2 py-1 rounded-lg uppercase">
                          Recomendado · 2.89%
                        </div>
                      )}
                    </div>
                  )}

                  {visibleMethods.map(method => {
                    const isSelected = selectedPaymentMethod === method.id;

                    // Ocultar PSE si Wompi está activo (Wompi ya incluye PSE)
                    if (method.id === 'pse' && settings.wompi?.enabled && settings.wompi?.publicKey) return null;

                    // Transferencia Bancaria — shows configurable bank info
                    if (method.id === 'transferencia') {
                      const ti = settings.transferInfo || {};
                      const hasInfo = ti.bankName || ti.accountNumber;
                      return (
                        <div
                          key="transferencia"
                          onClick={() => setSelectedPaymentMethod('transferencia')}
                          className={`p-5 border-2 rounded-2xl cursor-pointer transition-all ${isSelected ? 'border-brand-gold bg-amber-50/30' : 'border-gray-100 hover:border-gray-200'}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-white rounded-lg border border-gray-100 flex items-center justify-center text-brand-gold">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                              </div>
                              <div>
                                <span className="block font-bold text-slate-800 text-sm">{method.label}</span>
                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Sujeto a Validación</span>
                              </div>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-brand-gold' : 'border-gray-200'}`}>
                              {isSelected && <div className="w-2.5 h-2.5 bg-brand-gold rounded-full" />}
                            </div>
                          </div>

                          {isSelected && (
                            <div className="space-y-3 animate-fade-in mt-4 pl-1">
                              {hasInfo ? (
                                <div className="text-[11px] text-slate-600 bg-white p-4 rounded-xl border border-dashed border-brand-gold/30 leading-relaxed space-y-1">
                                  {ti.bankName && <p><b>Banco:</b> {ti.bankName}</p>}
                                  {ti.accountType && ti.accountNumber && (
                                    <p><b>Cuenta {ti.accountType}:</b> {ti.accountNumber}</p>
                                  )}
                                  {ti.accountHolder && <p><b>Titular:</b> {ti.accountHolder}</p>}
                                  {ti.receiptEmail && (
                                    <p><b>Envía el comprobante a:</b> <span className="text-brand-gold">{ti.receiptEmail}</span></p>
                                  )}
                                  {ti.instructions && <p className="text-slate-400 italic mt-2">{ti.instructions}</p>}
                                </div>
                              ) : (
                                <p className="text-[10px] text-slate-400 bg-white p-3 rounded-xl border border-dashed border-gray-200 italic">
                                  El administrador aún no ha configurado los datos bancarios. Contáctanos para recibir instrucciones de pago.
                                </p>
                              )}
                              <Input
                                id="receiptUrl"
                                label="URL del Comprobante o # de Transacción"
                                value={shippingInfo.receiptUrl || ''}
                                onChange={handleInputChange}
                                placeholder="Ej: https://imgur.com/foto-pago o N° de transacción"
                                required
                              />
                            </div>
                          )}
                        </div>
                      );
                    }

                    // Generic card for any other method (contra entrega, nequi, etc.)
                    return (
                      <div
                        key={method.id}
                        onClick={() => setSelectedPaymentMethod(method.id)}
                        className={`flex items-center justify-between p-5 border-2 rounded-2xl cursor-pointer transition-all ${isSelected ? 'border-brand-gold bg-amber-50/20' : 'border-gray-100 hover:border-gray-200'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white rounded-lg border border-gray-100 flex items-center justify-center text-xl">
                            {method.icon || '💳'}
                          </div>
                          <div>
                            <span className="block font-bold text-slate-800 text-sm">{method.label}</span>
                            {method.description && <span className="text-[10px] text-slate-400">{method.description}</span>}
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-brand-gold' : 'border-gray-200'}`}>
                          {isSelected && <div className="w-2.5 h-2.5 bg-brand-gold rounded-full" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Lado Derecho: Resumen del Carrito */}
          <div className="lg:col-span-1">
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-24">
              <h2 className="text-xl font-bold text-slate-800 mb-6">Resumen del Carrito</h2>
              
              <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto pr-2">
                {items.map((item) => (
                  <div key={item.itemKey} className="flex gap-3 py-2 border-b border-gray-50 last:border-0">
                    <img
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{item.product.name}</p>
                      {item.sizeInfo && (
                        <p className="text-[10px] text-brand-gold font-bold">
                          {item.sizeInfo.gender && `${item.sizeInfo.gender} · `}Talla {item.sizeInfo.size}
                        </p>
                      )}
                      <p className="text-xs text-slate-500">{item.quantity} x ${item.product.price.toLocaleString('es-CO')}</p>
                    </div>
                    <p className="text-sm font-bold text-slate-800">
                      ${(item.quantity * item.product.price).toLocaleString('es-CO')}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-3 py-4 border-t border-gray-100">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span>${totalAmount.toLocaleString('es-CO')}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Envío</span>
                  <span className={settings.shippingOnDelivery ? 'text-brand-gold font-bold italic text-[10px]' : (settings.shippingCost > 0 ? 'text-slate-800' : 'text-green-600 font-medium')}>
                    {settings.shippingOnDelivery ? 'Pagas al recibir (Flete)' : (settings.shippingCost > 0 ? `$${settings.shippingCost.toLocaleString('es-CO')}` : 'Gratis')}
                  </span>
                </div>
                <div className="flex justify-between text-xl font-bold text-brand-dark pt-2 border-t border-gray-100">
                  <span>Total a Pagar</span>
                  <span>${(totalAmount + (settings.shippingOnDelivery ? 0 : (settings.shippingCost || 0))).toLocaleString('es-CO')}</span>
                </div>
              </div>

              {items.some(item => item.isBackorder) && (
                <div className="mt-4 p-4 bg-brand-gold/5 border border-brand-gold/20 rounded-2xl animate-pulse">
                  <p className="text-[9px] text-brand-gold font-black uppercase tracking-widest mb-1">⚠️ Aviso de Encargo</p>
                  <p className="text-[9px] text-slate-500 leading-relaxed italic">
                    Tu pedido incluye productos bajo la modalidad de **Encargo**. Esto no implica compromiso de venta inicial y está sujeto a validación de disponibilidad (15-30 días).
                  </p>
                </div>
              )}

              <Button
                className={`w-full py-4 mt-6 text-lg ${selectedPaymentMethod === 'wompi' ? 'bg-[#E83C4E] hover:bg-[#c8303f]' : ''}`}
                onClick={selectedPaymentMethod === 'wompi' ? handleWompiPayment : handleConfirmOrder}
                disabled={isConfirming || items.length === 0}
              >
                {isConfirming ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {selectedPaymentMethod === 'wompi' ? 'Redirigiendo a Wompi...' : 'Procesando...'}
                  </span>
                ) : selectedPaymentMethod === 'wompi' ? 'Continuar a Wompi' : 'Confirmar y Pagar'}
              </Button>
              <p className="text-[10px] text-slate-400 text-center mt-4">
                Al confirmar, aceptas nuestros términos y condiciones de venta.
              </p>
            </section>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Checkout;
