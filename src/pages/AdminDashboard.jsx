import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, doc, updateDoc, addDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase.config';
import { useUserStore } from '../store/userStore';
import { useCartStore } from '../store/cartStore';
import MainLayout from '../components/templates/MainLayout';

const DashboardTab = React.lazy(() => import('../components/organisms/admin/DashboardTab'));
const ProductsTab = React.lazy(() => import('../components/organisms/admin/ProductsTab'));
const CategoriesTab = React.lazy(() => import('../components/organisms/admin/CategoriesTab'));
const SettingsTab = React.lazy(() => import('../components/organisms/admin/SettingsTab'));
const UsersTab = React.lazy(() => import('../components/organisms/admin/UsersTab'));

const MASTER_ADMIN = 'raulpte0211@gmail.com';

const AdminDashboard = () => {
  const { currentUser } = useUserStore();
  const { itemCount } = useCartStore();
  
  // Persistir pestaña activa
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('adminActiveTab') || 'dashboard';
  });

  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    localStorage.setItem('adminActiveTab', activeTab);
  }, [activeTab]);

  const hasAccess = currentUser && (currentUser.email === MASTER_ADMIN || currentUser.role === 'admin');
  
  useEffect(() => {
    if (!hasAccess) return;

    const fetchAllOrders = async () => {
      try {
        const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const ordersData = [];
        querySnapshot.forEach((doc) => {
          ordersData.push({ id: doc.id, ...doc.data() });
        });
        setOrders(ordersData);
      } catch (error) {
        console.error("Error al cargar todos los pedidos:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllOrders();
  }, [currentUser, hasAccess]);

  const handleConfirmPayment = async (order) => {
    setUpdatingId(order.id);
    try {
      // 1. Descontar Stock (ya que para transferencia no se hizo en el checkout)
      for (const item of order.items) {
        const productRef = doc(db, 'products', item.id);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          const newStock = Math.max(0, (productSnap.data().stockQuantity || 0) - item.quantity);
          await updateDoc(productRef, { stockQuantity: newStock });
        }
      }

      // 2. Actualizar estado de la orden
      const orderRef = doc(db, 'orders', order.id);
      await updateDoc(orderRef, { status: 'Pagado' });
      
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'Pagado' } : o));

      // 3. Notificación Final al Cliente e Admin Actual
      await addDoc(collection(db, 'mail'), {
        to: [order.userEmail, currentUser.email],
        message: {
          subject: `¡Pago Confirmado! Pedido DÚO DREAMS: ${order.orderNumber}`,
          html: `
            <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
              <h1 style="color: #c4a484;">¡Pago Validado con Éxito!</h1>
              <p>Hola, hemos verificado tu transferencia para el pedido <b>${order.orderNumber}</b>.</p>
              <p>Tu pedido ya está en proceso de despacho. ¡Muchas gracias por tu compra!</p>
              <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
              <p style="font-size: 12px; color: #94a3b8;">DÚO DREAMS - Tienda Oficial</p>
            </div>
          `
        }
      });

      alert("¡Pago confirmado! Stock descontado y cliente notificado.");
    } catch (error) {
      console.error("Error al confirmar pago:", error);
      alert("Error al confirmar el pago.");
    } finally {
      setUpdatingId(null);
    }
  };

  const [trackingInfo, setTrackingInfo] = useState({ id: null, number: '', carrier: 'Coordinadora' });

  const handleUpdateStatus = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      alert(`Pedido actualizado a: ${newStatus}`);
    } catch (error) {
      console.error("Error al actualizar estado:", error);
      alert("Error al actualizar el estado del pedido.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDispatch = async (e) => {
    e.preventDefault();
    const { id, number, carrier } = trackingInfo;
    if (!number) return alert("Ingresa el número de guía");
    
    setUpdatingId(id);
    try {
      const order = orders.find(o => o.id === id);
      await updateDoc(doc(db, 'orders', id), { 
        status: 'Despachado',
        trackingNumber: number,
        carrier: carrier
      });

      // Notificar al cliente con su guía
      await addDoc(collection(db, 'mail'), {
        to: [order.userEmail],
        message: {
          subject: `📦 ¡Tu pedido ha sido despachado! - ${order.orderNumber}`,
          html: `
            <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
              <h1 style="color: #c4a484;">¡Tu pedido va en camino!</h1>
              <p>Hola, tu pedido <b>${order.orderNumber}</b> ya ha sido entregado a la transportadora.</p>
              <div style="background: #f8fafc; padding: 20px; border-radius: 15px; border: 1px solid #f1f5f9; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px;"><b>Transportadora:</b> ${carrier}</p>
                <p style="margin: 10px 0 0 0; font-size: 16px;"><b>Número de Guía:</b> <span style="color: #B76E79; font-weight: bold;">${number}</span></p>
              </div>
              <p>Pronto estarás disfrutando de tus productos DÚO DREAMS.</p>
              <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
              <p style="font-size: 12px; color: #94a3b8;">DÚO DREAMS - Tienda Oficial</p>
            </div>
          `
        }
      });

      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'Despachado', trackingNumber: number, carrier } : o));
      setTrackingInfo({ id: null, number: '', carrier: 'Coordinadora' });
      alert("Pedido despachado y cliente notificado.");
    } catch (e) {
      alert("Error al despachar: " + e.message);
    } finally {
      setUpdatingId(null);
    }
  };

  if (!hasAccess) {
    return (
      <MainLayout cartItemCount={itemCount}>
        <div className="py-20 text-center animate-shake">
          <h2 className="text-2xl font-bold text-red-600">Acceso Denegado</h2>
          <p className="text-slate-500 mt-2">Esta sección es solo para el administrador.</p>
          <button onClick={() => window.location.href = '/'} className="mt-6 text-brand-gold font-bold">Volver al Inicio</button>
        </div>
      </MainLayout>
    );
  }

  const tabs = [
    { id: 'dashboard', label: '📊 Dashboard', color: 'text-brand-gold' },
    { id: 'orders', label: '📦 Pedidos', color: 'text-brand-dark' },
    { id: 'products', label: '👗 Inventario', color: 'text-brand-dark' },
    { id: 'users', label: '👥 Usuarios', color: 'text-brand-dark' },
    { id: 'categories', label: '🏷️ Categorías', color: 'text-brand-dark' },
    { id: 'settings', label: '⚙️ Configuración', color: 'text-brand-dark' },
  ];

  return (
    <MainLayout cartItemCount={itemCount}>
      <div className="max-w-7xl mx-auto py-10 px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-4xl font-black text-brand-dark tracking-tighter">Panel de Control</h1>
            <p className="text-slate-400 font-medium">Gestión Administrativa DÚO DREAMS</p>
          </div>
          <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
            <div className="w-10 h-10 bg-brand-gold rounded-xl flex items-center justify-center text-white font-bold">
              {currentUser.email[0].toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-bold text-brand-dark">{currentUser.email}</p>
              <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">{currentUser.role === 'admin' ? 'Delegado' : 'Súper Admin'}</p>
            </div>
          </div>
        </div>

        {/* Tabs de Navegación */}
        <div className="flex overflow-x-auto pb-4 mb-8 gap-2 no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-2xl font-bold text-sm whitespace-nowrap transition-all duration-300 ${
                activeTab === tab.id 
                  ? 'bg-brand-dark text-white shadow-lg scale-105' 
                  : 'bg-white text-slate-400 hover:bg-gray-50 border border-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Contenido de Tabs */}
        <div className="min-h-[500px]">
          <React.Suspense fallback={<div className="py-20 text-center text-slate-400">Cargando módulo...</div>}>
            {activeTab === 'dashboard' && <DashboardTab />}
            {activeTab === 'products' && <ProductsTab />}
            {activeTab === 'categories' && <CategoriesTab />}
            {activeTab === 'settings' && <SettingsTab />}
            {activeTab === 'users' && <UsersTab />}
          </React.Suspense>
          
          {activeTab === 'orders' && (
            <div className="overflow-x-auto bg-white rounded-3xl border border-gray-100 shadow-sm animate-fade-in">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 text-slate-400 text-[10px] uppercase tracking-widest font-bold">
                    <th className="px-6 py-4">Orden</th>
                    <th className="px-6 py-4">Cliente</th>
                    <th className="px-6 py-4">Total</th>
                    <th className="px-6 py-4">Estado Actual</th>
                    <th className="px-6 py-4">Cambiar Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-brand-dark text-sm">{order.orderNumber}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-brand-dark font-medium">{order.userEmail}</div>
                        <div className="text-[10px] text-slate-400">{new Date(order.createdAt).toLocaleDateString()}</div>
                      </td>
                      <td className="px-6 py-4 font-bold text-brand-dark">${order.totalAmount.toLocaleString('es-CO')}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                          order.status === 'Validación de Pago' ? 'bg-red-100 text-red-600 animate-pulse' :
                          order.status === 'Despachado' ? 'bg-purple-100 text-purple-600' :
                          order.status === 'Entregado' ? 'bg-green-100 text-green-600' :
                          order.status === 'Pagado' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100'
                        }`}>
                          {order.status}
                        </span>
                        {order.receiptUrl && (
                          <a href={order.receiptUrl} target="_blank" rel="noreferrer" className="block mt-2 text-[10px] text-blue-500 font-bold underline">
                            Ver Comprobante ↗
                          </a>
                        )}
                      </td>
                      <td className="px-6 py-4">
                      {order.status === 'Validación de Pago' ? (
                        <button 
                          onClick={() => handleConfirmPayment(order)}
                          className="bg-brand-gold text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-brand-dark transition-all"
                          disabled={updatingId === order.id}
                        >
                          {updatingId === order.id ? '...' : 'Confirmar Pago'}
                        </button>
                      ) : (
                        <div className="space-y-2">
                          <select 
                            value={order.status}
                            onChange={(e) => {
                              const newStatus = e.target.value;
                              if (newStatus === 'Despachado') {
                                setTrackingInfo({ ...trackingInfo, id: order.id });
                              } else {
                                handleUpdateStatus(order.id, newStatus);
                              }
                            }}
                            className="bg-gray-50 border-none rounded-lg p-1 text-[10px] font-bold outline-none uppercase tracking-widest"
                            disabled={updatingId === order.id}
                          >
                            <option value="Pagado">Pagado</option>
                            <option value="Despachado">Despachado</option>
                            <option value="Entregado">Entregado</option>
                            <option value="Cancelado">Cancelado</option>
                          </select>
                          
                          {/* Formulario de Guía si se selecciona Despachado */}
                          {trackingInfo.id === order.id && (
                            <form onSubmit={handleDispatch} className="mt-2 p-3 bg-brand-gold/5 rounded-xl border border-brand-gold/20 animate-fade-in space-y-2">
                              <input 
                                type="text"
                                placeholder="Número de Guía"
                                value={trackingInfo.number}
                                onChange={(e) => setTrackingInfo({ ...trackingInfo, number: e.target.value })}
                                className="w-full text-[10px] p-2 rounded-lg border-none outline-none focus:ring-1 focus:ring-brand-gold"
                                autoFocus
                              />
                              <select 
                                value={trackingInfo.carrier}
                                onChange={(e) => setTrackingInfo({ ...trackingInfo, carrier: e.target.value })}
                                className="w-full text-[10px] p-2 rounded-lg border-none outline-none"
                              >
                                <option value="Coordinadora">Coordinadora</option>
                                <option value="Servientrega">Servientrega</option>
                                <option value="Envía">Envía</option>
                                <option value="Interrapidisimo">Interrapidisimo</option>
                              </select>
                              <div className="flex gap-1">
                                <button type="submit" className="flex-1 bg-brand-gold text-white text-[9px] py-1.5 rounded-lg font-black uppercase">Guardar</button>
                                <button type="button" onClick={() => setTrackingInfo({ id: null, number: '', carrier: 'Coordinadora' })} className="px-2 text-[9px] text-slate-400 font-bold uppercase">X</button>
                              </div>
                            </form>
                          )}
                          
                          {order.trackingNumber && (
                            <div className="text-[9px] text-slate-400 font-bold flex flex-col">
                              <span>Guía: {order.trackingNumber}</span>
                              <span className="text-brand-gold/60 uppercase">{order.carrier}</span>
                            </div>
                          )}
                        </div>
                      )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {orders.length === 0 && (
                <div className="py-20 text-center text-slate-400">No hay pedidos registrados.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default AdminDashboard;
