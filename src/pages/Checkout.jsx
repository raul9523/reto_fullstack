import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase.config.js';
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

  useEffect(() => {
    fetchSettings();
    // Si hay usuario y se elige misma dirección, precargar sus datos
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
      // Limpiar campos si decide cambiar dirección para que los llene desde cero
      setShippingInfo({
        recipientName: '',
        recipientPhone: '',
        department: 'Antioquia',
        city: 'Medellín',
        address: '',
        notes: ''
      });
    }

    const fetchPaymentMethods = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "payment_methods"));
        const methods = [];
        querySnapshot.forEach((doc) => {
          if (settings.paymentMethods[doc.id] !== false) {
            methods.push({ id: doc.id, ...doc.data() });
          }
        });
        setPaymentMethods(methods);
        if (methods.length > 0) setSelectedPaymentMethod(methods[0].id);
      } catch (error) {
        console.error("Error fetching payment methods:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPaymentMethods();
  }, [currentUser, settings.paymentMethods, isSameAddress]);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setShippingInfo(prev => ({ ...prev, [id]: value }));
  };

  const handleConfirmOrder = async () => {
    if (items.length === 0) return;
    if (selectedPaymentMethod === 'transfer' && !shippingInfo.notes) {
      // Usaremos el campo 'notes' o uno nuevo para el comprobante
    }
    
    setIsConfirming(true);
    try {
      const orderId = `ORD-${Date.now().toString().slice(-6)}`;
      const totalWithShipping = totalAmount + (settings.shippingCost || 0);
      
      // Determinar estado inicial y si descuenta stock de una vez
      const isInstantPayment = selectedPaymentMethod === 'pse' || selectedPaymentMethod === 'card';
      const initialStatus = isInstantPayment ? 'Pagado' : 'Validación de Pago';

      const orderData = {
        orderNumber: orderId,
        userId: currentUser.uid,
        userEmail: currentUser.email,
        items: items.map(item => ({
          id: item.product.id,
          name: item.product.name,
          price: item.product.price,
          cost: item.product.cost || (item.product.price * 0.6),
          quantity: item.quantity,
          category: item.product.category
        })),
        subtotal: totalAmount,
        shippingCost: settings.shippingCost || 0,
        totalAmount: totalWithShipping,
        shippingInfo,
        paymentMethod: selectedPaymentMethod,
        receiptUrl: shippingInfo.receiptUrl || '', // Nuevo campo para transferencia
        status: initialStatus,
        createdAt: new Date().toISOString()
      };

      // 1. Guardar el pedido en Firestore
      await addDoc(collection(db, 'orders'), orderData);

      // 2. Lógica condicionada al tipo de pago
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

        // NOTIFICACIÓN DE ÉXITO INMEDIATA
        await addDoc(collection(db, 'mail'), {
          to: [currentUser.email, 'raulpte0211@gmail.com'],
          message: {
            subject: `¡Pago Confirmado! Pedido DÚO DREAMS: ${orderId}`,
            html: `
              <h1>¡Gracias por tu compra!</h1>
              <p>Tu pago por <b>PSE</b> ha sido confirmado. El pedido <b>${orderId}</b> ya está en proceso.</p>
              <p>Total: <b>$${totalWithShipping.toLocaleString('es-CO')}</b></p>
            `
          }
        });
      } else {
        // NOTIFICACIÓN DE "ESPERA" PARA TRANSFERENCIA
        await addDoc(collection(db, 'mail'), {
          to: [currentUser.email],
          message: {
            subject: `Pedido en Validación: ${orderId}`,
            html: `
              <h1>Recibimos tu solicitud de pedido</h1>
              <p>Estamos validando tu transferencia para el pedido <b>${orderId}</b>.</p>
              <p>Una vez confirmemos el pago, recibirás un correo de confirmación y procesaremos tu envío.</p>
            `
          }
        });
        // Notificar al admin que hay algo que validar
        await addDoc(collection(db, 'mail'), {
          to: ['raulpte0211@gmail.com'],
          message: {
            subject: `NUEVA VALIDACIÓN PENDIENTE: ${orderId}`,
            html: `<p>El cliente ${currentUser.email} ha subido un comprobante. Revisa el panel de control.</p>`
          }
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
                    {/* PSE Visual Button */}
                    <div 
                      onClick={() => setSelectedPaymentMethod('pse')}
                      className={`flex items-center justify-between p-4 border rounded-2xl cursor-pointer transition-all ${
                        selectedPaymentMethod === 'pse' ? 'border-brand-gold bg-blue-50/50' : 'border-gray-100'
                      }`}
                    >
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-white rounded-lg border border-gray-100 flex items-center justify-center p-1 mr-3">
                          <img src="https://www.pse.com.co/documents/d/pse/logo-pse" alt="PSE" className="w-full object-contain" />
                        </div>
                        <div>
                          <span className="block font-bold text-slate-800 text-sm">PSE (Débito Bancario)</span>
                          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Confirmación Inmediata</span>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedPaymentMethod === 'pse' ? 'border-brand-gold' : 'border-gray-200'}`}>
                        {selectedPaymentMethod === 'pse' && <div className="w-2.5 h-2.5 bg-brand-gold rounded-full"></div>}
                      </div>
                    </div>

                    {/* Transferencia Bancaria */}
                    <div 
                      onClick={() => setSelectedPaymentMethod('transfer')}
                      className={`p-5 border rounded-2xl cursor-pointer transition-all ${
                        selectedPaymentMethod === 'transfer' ? 'border-brand-gold bg-blue-50/50' : 'border-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-white rounded-lg border border-gray-100 flex items-center justify-center mr-3 text-brand-gold">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                          </div>
                          <div>
                            <span className="block font-bold text-slate-800 text-sm">Transferencia Bancaria</span>
                            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Sujeto a Validación</span>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedPaymentMethod === 'transfer' ? 'border-brand-gold' : 'border-gray-200'}`}>
                          {selectedPaymentMethod === 'transfer' && <div className="w-2.5 h-2.5 bg-brand-gold rounded-full"></div>}
                        </div>
                      </div>

                      {selectedPaymentMethod === 'transfer' && (
                        <div className="space-y-3 animate-fade-in pl-1">
                          <p className="text-[10px] text-slate-500 bg-white p-3 rounded-xl border border-dashed border-gray-200 leading-relaxed">
                            Realiza tu transferencia a la cuenta <b>Ahorros Bancolombia #123-456789-01</b> a nombre de DÚO DREAMS. 
                            Luego, pega el enlace del comprobante o número de transacción abajo.
                          </p>
                          <Input 
                            id="receiptUrl"
                            label="URL del Comprobante o # de Transacción"
                            value={shippingInfo.receiptUrl || ''}
                            onChange={handleInputChange}
                            placeholder="Ej: https://imgur.com/foto-pago"
                            required
                          />
                        </div>
                      )}
                    </div>
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
                  <div key={item.product.id} className="flex gap-3 py-2 border-b border-gray-50 last:border-0">
                    <img 
                      src={item.product.imageUrl} 
                      alt={item.product.name} 
                      className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{item.product.name}</p>
                      <p className="text-xs text-slate-500">{item.quantity} x ${item.product.price.toLocaleString('es-MX')}</p>
                    </div>
                    <p className="text-sm font-bold text-slate-800">
                      ${(item.quantity * item.product.price).toLocaleString('es-MX')}
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
                  <span className={settings.shippingCost > 0 ? 'text-slate-800' : 'text-green-600 font-medium'}>
                    {settings.shippingCost > 0 ? `$${settings.shippingCost.toLocaleString('es-CO')}` : 'Gratis'}
                  </span>
                </div>
                <div className="flex justify-between text-xl font-bold text-slate-800 pt-2 border-t border-gray-100">
                  <span>Total</span>
                  <span>${(totalAmount + (settings.shippingCost || 0)).toLocaleString('es-CO')}</span>
                </div>
              </div>

              <Button 
                className="w-full py-4 mt-6 text-lg" 
                onClick={handleConfirmOrder}
                disabled={isConfirming || items.length === 0}
              >
                {isConfirming ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Procesando...
                  </span>
                ) : 'Confirmar y Pagar'}
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
