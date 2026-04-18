import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase.config';
import { useUserStore } from '../store/userStore';
import MainLayout from '../components/templates/MainLayout';
import { useCartStore } from '../store/cartStore';

const AdminDashboard = () => {
  const { currentUser } = useUserStore();
  const { itemCount } = useCartStore();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const ADMIN_EMAIL = 'raulpte0211@gmail.com';

  useEffect(() => {
    if (!currentUser || currentUser.email !== ADMIN_EMAIL) return;

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
  }, [currentUser]);

  const handleUpdateStatus = async (orderId, newStatus, userEmail, orderNumber) => {
    setUpdatingId(orderId);
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, { status: newStatus });
      
      // Actualizar estado local
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));

      // Disparar correo de actualización de estado
      await addDoc(collection(db, 'mail'), {
        to: [userEmail],
        message: {
          subject: `Actualización de tu pedido DÚO DREAMS: ${orderNumber}`,
          html: `
            <h1>¡Tu pedido tiene novedades!</h1>
            <p>El estado de tu pedido <b>${orderNumber}</b> ha cambiado a: <b>${newStatus}</b>.</p>
            <p>Gracias por confiar en DÚO DREAMS.</p>
          `
        }
      });

    } catch (error) {
      console.error("Error al actualizar estado:", error);
      alert("Error al actualizar el estado del pedido.");
    } finally {
      setUpdatingId(null);
    }
  };

  if (!currentUser || currentUser.email !== ADMIN_EMAIL) {
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

  return (
    <MainLayout cartItemCount={itemCount}>
      <div className="max-w-6xl mx-auto py-10 px-4">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold text-brand-dark">Panel Administrativo</h1>
            <p className="text-slate-500">Gestión Gerencial de Pedidos - DÚO DREAMS</p>
          </div>
          <div className="bg-brand-gold/10 text-brand-gold px-4 py-2 rounded-xl text-sm font-bold">
            Admin: {currentUser.email}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-gold"></div>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white rounded-3xl border border-gray-100 shadow-sm">
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
                        order.status === 'Recibido' ? 'bg-blue-100 text-blue-600' :
                        order.status === 'En Proceso' ? 'bg-amber-100 text-amber-600' :
                        order.status === 'Despachado' ? 'bg-purple-100 text-purple-600' :
                        order.status === 'Pagado' ? 'bg-green-100 text-green-600' : 'bg-gray-100'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1 flex-wrap">
                        {['En Proceso', 'Despachado', 'Pagado'].map(status => (
                          <button
                            key={status}
                            disabled={order.status === status || updatingId === order.id}
                            onClick={() => handleUpdateStatus(order.id, status, order.userEmail, order.orderNumber)}
                            className={`px-2 py-1 rounded text-[9px] font-bold uppercase transition-all ${
                              order.status === status 
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                : 'bg-brand-dark text-white hover:bg-brand-gold'
                            }`}
                          >
                            {status === updatingId ? '...' : status}
                          </button>
                        ))}
                      </div>
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
    </MainLayout>
  );
};

export default AdminDashboard;
