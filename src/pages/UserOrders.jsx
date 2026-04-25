import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase/firebase.config';
import { useUserStore } from '../store/userStore';
import MainLayout from '../components/templates/MainLayout';
import { useCartStore } from '../store/cartStore';

const UserOrders = () => {
  const { currentUser } = useUserStore();
  const { itemCount } = useCartStore();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const fetchOrders = async () => {
      try {
        const q = query(
          collection(db, 'orders'),
          where('userId', '==', currentUser.uid)
        );
        const querySnapshot = await getDocs(q);
        const ordersData = [];
        querySnapshot.forEach((doc) => {
          ordersData.push({ id: doc.id, ...doc.data() });
        });
        
        // Ordenar en memoria para evitar el error de índice de Firestore
        ordersData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        setOrders(ordersData);
      } catch (error) {
        console.error("Error al cargar pedidos:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [currentUser]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Entregado': return 'bg-green-100 text-green-600';
      case 'Facturado': return 'bg-emerald-100 text-emerald-700';
      case 'Despachado': return 'bg-purple-100 text-purple-600';
      case 'Pagado': return 'bg-blue-100 text-blue-600';
      case 'Validación de Pago': return 'bg-red-100 text-red-600';
      case 'Cancelado': return 'bg-slate-100 text-slate-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  if (!currentUser) {
    return (
      <MainLayout cartItemCount={itemCount}>
        <div className="py-20 text-center">
          <h2 className="text-2xl font-bold">Inicia sesión para ver tu historial</h2>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout cartItemCount={itemCount}>
      <div className="max-w-4xl mx-auto py-10 px-4">
        <h1 className="text-3xl font-bold text-brand-dark mb-8">Mis Pedidos</h1>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-gold"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white p-10 rounded-3xl text-center border border-gray-100">
            <p className="text-slate-500 mb-6">Aún no has realizado ningún pedido.</p>
            <button 
              onClick={() => window.location.href = '/'}
              className="text-brand-gold font-bold hover:underline"
            >
              Ir a la tienda
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 animate-fade-in-up">
                <div className="flex flex-wrap justify-between items-start gap-4 mb-4 border-b border-gray-50 pb-4">
                  <div>
                    <span className="text-xs text-slate-400 uppercase tracking-widest font-bold">Pedido</span>
                    <h3 className="text-lg font-bold text-brand-dark">{order.orderNumber}</h3>
                    <p className="text-xs text-slate-400">{new Date(order.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                    <p className="text-xl font-bold text-brand-dark mt-2">${order.totalAmount.toLocaleString('es-CO')}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-slate-600">{item.quantity}x {item.name}</span>
                      <span className="text-slate-400">${(item.price * item.quantity).toLocaleString('es-CO')}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-50 flex justify-between items-center">
                  <div className="text-xs text-slate-400">
                    <p>Enviado a: <span className="text-slate-600 font-medium">{order.shippingInfo.address}</span></p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default UserOrders;
