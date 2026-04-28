import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../../firebase/firebase.config';

const OrderBacklogTab = () => {
  const [backorders, setBackorders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [grouped, setGrouped] = useState({});

  useEffect(() => {
    const q = query(
      collection(db, 'orders'),
      where('isBackorder', '==', true),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const orders = [];
      querySnapshot.forEach((doc) => {
        orders.push({ id: doc.id, ...doc.data() });
      });
      setBackorders(orders);

      // Agrupar por producto y talla
      const groupedData = {};
      orders.forEach((order) => {
        order.items?.forEach((item) => {
          const productName = item.name;
          const talla = item.selectedSize || 'Sin Talla';
          const key = `${productName}_${talla}`;

          if (!groupedData[productName]) {
            groupedData[productName] = {};
          }
          if (!groupedData[productName][talla]) {
            groupedData[productName][talla] = [];
          }

          groupedData[productName][talla].push({
            orderId: order.orderNumber,
            quantity: item.quantity,
            customer: order.customerInfo?.name || 'Cliente',
            email: order.customerInfo?.email || order.userEmail,
            date: order.createdAt,
            status: order.status,
          });
        });
      });

      setGrouped(groupedData);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getTotalBySize = (product, talla) => {
    if (!grouped[product] || !grouped[product][talla]) return 0;
    return grouped[product][talla].reduce((sum, item) => sum + item.quantity, 0);
  };

  const getTotalBackorders = () => {
    return backorders.reduce((sum, order) => {
      return sum + (order.items?.reduce((s, item) => s + item.quantity, 0) || 0);
    }, 0);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-gold"></div>
      </div>
    );
  }

  if (Object.keys(grouped).length === 0) {
    return (
      <div className="bg-white p-10 rounded-3xl text-center border border-gray-100">
        <p className="text-slate-500">No hay encargos registrados.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Resumen */}
      <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-6 rounded-3xl border border-orange-200">
        <h3 className="text-lg font-bold text-orange-900 mb-2">📦 Resumen de Encargos</h3>
        <p className="text-sm text-orange-800">
          Total de <span className="font-black">{getTotalBackorders()}</span> unidades en{' '}
          <span className="font-black">{backorders.length}</span> órdenes
        </p>
      </div>

      {/* Por Producto */}
      <div className="space-y-4">
        {Object.entries(grouped).map(([product, sizes]) => (
          <div key={product} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
            <h4 className="text-sm font-bold text-brand-dark mb-4 uppercase tracking-widest">
              {product}
            </h4>

            {/* Por Talla */}
            <div className="space-y-3">
              {Object.entries(sizes).map(([talla, items]) => (
                <div key={talla} className="border-l-4 border-brand-gold pl-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-slate-700">Talla: {talla}</span>
                    <span className="bg-brand-gold text-white px-3 py-1 rounded-full text-xs font-black">
                      {getTotalBySize(product, talla)} unidades
                    </span>
                  </div>

                  {/* Clientes que la pidieron */}
                  <div className="space-y-2 bg-gray-50 p-3 rounded-2xl">
                    {items.map((item, idx) => (
                      <div key={idx} className="text-[10px] flex justify-between items-start">
                        <div>
                          <p className="font-bold text-slate-700">{item.customer}</p>
                          <p className="text-slate-400">{item.email}</p>
                          <p className="text-slate-400">
                            Orden: <span className="font-mono">{item.orderId}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-brand-gold">{item.quantity}</span>
                          <p className="text-slate-400 text-[9px]">
                            {new Date(item.date).toLocaleDateString('es-CO')}
                          </p>
                          <p
                            className={`text-[9px] font-bold uppercase mt-1 px-2 py-0.5 rounded w-fit ${
                              item.status === 'Validación de Encargo'
                                ? 'bg-orange-100 text-orange-600'
                                : 'bg-green-100 text-green-600'
                            }`}
                          >
                            {item.status}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderBacklogTab;
