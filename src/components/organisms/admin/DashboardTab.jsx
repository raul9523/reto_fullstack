import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../../firebase/firebase.config';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

const DashboardTab = () => {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [dateRange, setDateRange] = useState('all'); 
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterProduct, setFilterProduct] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      const oSnap = await getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'asc')));
      const os = [];
      oSnap.forEach(doc => os.push({ id: doc.id, ...doc.data() }));
      setOrders(os);

      const pSnap = await getDocs(collection(db, 'products'));
      const ps = [];
      pSnap.forEach(doc => ps.push({ id: doc.id, ...doc.data() }));
      setProducts(ps);

      const cSnap = await getDocs(collection(db, 'categories'));
      const cs = [];
      cSnap.forEach(doc => cs.push({ id: doc.id, ...doc.data() }));
      setCategories(cs);

      const uSnap = await getDocs(collection(db, 'users'));
      const us = [];
      uSnap.forEach(doc => us.push({ id: doc.id, ...doc.data() }));
      setUsers(us);
      
      setIsLoading(false);
    };
    fetchData();
  }, []);

  // ... (filtro y stats se mantienen igual)
  const filteredOrders = useMemo(() => {
    let result = [...orders];
    const now = new Date();
    if (dateRange === 'today') result = result.filter(o => new Date(o.createdAt).toDateString() === now.toDateString());
    else if (dateRange === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      result = result.filter(o => new Date(o.createdAt) >= weekAgo);
    } else if (dateRange === 'month') {
      const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);
      result = result.filter(o => new Date(o.createdAt) >= monthAgo);
    }
    if (filterCategory !== 'all') result = result.filter(o => o.items.some(item => item.category === filterCategory));
    if (filterProduct !== 'all') result = result.filter(o => o.items.some(item => item.id === filterProduct));
    return result;
  }, [orders, dateRange, filterCategory, filterProduct]);

  const stats = useMemo(() => {
    let totalSales = 0; let totalCost = 0; let totalUnits = 0; let totalShipping = 0;
    filteredOrders.forEach(o => {
      totalSales += o.subtotal || o.totalAmount - (o.shippingCost || 0);
      totalShipping += o.shippingCost || 0;
      o.items.forEach(item => {
        if (filterProduct === 'all' || item.id === filterProduct) {
          totalUnits += item.quantity;
          totalCost += (item.cost || 0) * item.quantity;
        }
      });
    });
    const netProfit = totalSales - totalCost;
    return { totalSales, totalCost, totalUnits, totalShipping, netProfit };
  }, [filteredOrders, filterProduct]);

  const chartData = useMemo(() => {
    const daily = {};
    filteredOrders.forEach(o => {
      const date = new Date(o.createdAt).toLocaleDateString();
      if (!daily[date]) daily[date] = { date, ventas: 0, ganancia: 0 };
      daily[date].ventas += o.subtotal || o.totalAmount - (o.shippingCost || 0);
      let orderCost = 0;
      o.items.forEach(item => orderCost += (item.cost || 0) * item.quantity);
      daily[date].ganancia += (o.subtotal || o.totalAmount - (o.shippingCost || 0)) - orderCost;
    });
    return Object.values(daily);
  }, [filteredOrders]);

  // Nueva Gráfica: Distribución Geográfica de Clientes
  const cityData = useMemo(() => {
    const counts = {};
    users.forEach(u => {
      const city = u.city || 'Desconocida';
      counts[city] = (counts[city] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8 ciudades
  }, [users]);

  if (isLoading) return <div className="py-20 text-center">Analizando datos...</div>;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Filtros */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px] space-y-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Rango de Fecha</label>
          <div className="flex bg-gray-50 p-1 rounded-xl">
            {['all', 'today', 'week', 'month'].map(r => (
              <button 
                key={r}
                onClick={() => setDateRange(r)}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${dateRange === r ? 'bg-white text-brand-gold shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {r === 'all' ? 'Todo' : r === 'today' ? 'Hoy' : r === 'week' ? 'Semana' : 'Mes'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-[150px] space-y-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Categoría</label>
          <select 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-gold/20"
          >
            <option value="all">Todas</option>
            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>

        <div className="flex-1 min-w-[200px] space-y-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Producto Específico</label>
          <select 
            value={filterProduct} 
            onChange={(e) => setFilterProduct(e.target.value)}
            className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-gold/20"
          >
            <option value="all">Todos los productos</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {/* Tarjetas de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard title="Ventas Netas" value={`$${stats.totalSales.toLocaleString('es-CO')}`} color="text-brand-dark" />
        <MetricCard title="Costos" value={`$${stats.totalCost.toLocaleString('es-CO')}`} color="text-red-500" />
        <MetricCard title="Ganancia Neta" value={`$${stats.netProfit.toLocaleString('es-CO')}`} color="text-green-600" bg="bg-green-50" />
        <MetricCard title="Unds. Vendidas" value={stats.totalUnits} color="text-brand-gold" />
        <MetricCard title="Total Clientes" value={users.length} color="text-slate-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gráfica Rendimiento */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm min-h-[400px]">
          <h3 className="text-lg font-bold text-brand-dark mb-8">Rendimiento Histórico</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} tickFormatter={(value) => `$${value/1000}k`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  formatter={(value) => [`$${value.toLocaleString()}`, '']}
                />
                <Line type="monotone" dataKey="ventas" stroke="#1A1A1A" strokeWidth={3} dot={{ r: 4, fill: '#1A1A1A' }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="ganancia" stroke="#B76E79" strokeWidth={3} dot={{ r: 4, fill: '#B76E79' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfica Geográfica */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm min-h-[400px]">
          <h3 className="text-lg font-bold text-brand-dark mb-8">Ubicación de Clientes</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={cityData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} width={100} />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="value" fill="#B76E79" radius={[0, 10, 10, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, color, bg = "bg-white" }) => (
  <div className={`${bg} p-6 rounded-3xl border border-gray-100 shadow-sm`}>
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
    <p className={`text-xl font-black ${color}`}>{value}</p>
  </div>
);

export default DashboardTab;
