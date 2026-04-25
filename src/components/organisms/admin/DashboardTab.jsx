import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../../firebase/firebase.config';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useSettingsStore } from '../../../store/settingsStore';

const DashboardTab = () => {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [dateRange, setDateRange] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterProduct, setFilterProduct] = useState('all');
  const [invoiceFilter, setInvoiceFilter] = useState('all');

  const [paymentModal, setPaymentModal] = useState({ open: false, order: null });
  const [paymentForm, setPaymentForm] = useState({ amount: '', date: '', reference: '', receiptUrl: '' });
  const [savingPayment, setSavingPayment] = useState(false);
  const { settings, fetchSettings } = useSettingsStore();

  useEffect(() => {
    fetchSettings();
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
  }, [fetchSettings]);

  const invoicesWithVat = !!settings.tax?.invoicesWithVat;
  const vatRate = Number(settings.tax?.vatRate) || 0;

  const getOrderGrossSales = (order) => order.subtotal || (order.totalAmount - (order.shippingCost || 0));

  const getOrderNetSales = (order) => {
    const gross = getOrderGrossSales(order);
    if (!invoicesWithVat || vatRate <= 0) return gross;
    const explicitVat = Number(order.taxSummary?.saleVatTotal);
    if (!Number.isNaN(explicitVat) && explicitVat > 0) return Math.max(0, gross - explicitVat);
    return gross / (1 + vatRate / 100);
  };

  const getItemCostForReport = (item) => {
    const quantity = Number(item.quantity) || 0;
    const costBase = Number(item.costBase ?? ((item.cost || 0) - (item.purchaseVat || 0)));
    const purchaseVat = Number(item.purchaseVat ?? 0);
    const costTotal = Number(item.cost ?? (costBase + purchaseVat));
    if (invoicesWithVat) return (Number.isNaN(costBase) ? costTotal : costBase) * quantity;
    return (Number.isNaN(costTotal) ? 0 : costTotal) * quantity;
  };

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
      totalSales += getOrderNetSales(o);
      totalShipping += o.shippingCost || 0;
      o.items.forEach(item => {
        if (filterProduct === 'all' || item.id === filterProduct) {
          totalUnits += item.quantity;
          totalCost += getItemCostForReport(item);
        }
      });
    });
    const netProfit = totalSales - totalCost;
    return { totalSales, totalCost, totalUnits, totalShipping, netProfit };
  }, [filteredOrders, filterProduct, invoicesWithVat, vatRate]);

  const chartData = useMemo(() => {
    const daily = {};
    filteredOrders.forEach(o => {
      const date = new Date(o.createdAt).toLocaleDateString();
      if (!daily[date]) daily[date] = { date, ventas: 0, ganancia: 0 };
      daily[date].ventas += getOrderNetSales(o);
      let orderCost = 0;
      o.items.forEach(item => orderCost += getItemCostForReport(item));
      daily[date].ganancia += getOrderNetSales(o) - orderCost;
    });
    return Object.values(daily);
  }, [filteredOrders, invoicesWithVat, vatRate]);

  // Cartera vencida
  const carteraData = useMemo(() => {
    const today = new Date();
    const credit = orders.filter(o => o.paymentMethod === 'credito' && o.status !== 'Pagado');
    const overdue = credit.filter(o => {
      const due = new Date(o.createdAt);
      due.setDate(due.getDate() + (o.creditDays || 30));
      return due < today;
    });
    const totalCartera = credit.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const totalVencida = overdue.reduce((s, o) => s + (o.totalAmount || 0), 0);

    const buckets = { 'Al día': 0, '1-30 días': 0, '31-60 días': 0, '61-90 días': 0, '+90 días': 0 };
    credit.forEach(o => {
      const due = new Date(o.createdAt);
      due.setDate(due.getDate() + (o.creditDays || 30));
      const daysLate = Math.floor((today - due) / 86400000);
      if (daysLate <= 0) buckets['Al día'] += o.totalAmount || 0;
      else if (daysLate <= 30) buckets['1-30 días'] += o.totalAmount || 0;
      else if (daysLate <= 60) buckets['31-60 días'] += o.totalAmount || 0;
      else if (daysLate <= 90) buckets['61-90 días'] += o.totalAmount || 0;
      else buckets['+90 días'] += o.totalAmount || 0;
    });
    const agingChart = Object.entries(buckets).map(([name, value]) => ({ name, value }));

    const overdueList = overdue.map(o => {
      const due = new Date(o.createdAt);
      due.setDate(due.getDate() + (o.creditDays || 30));
      return { ...o, daysLate: Math.floor((today - due) / 86400000) };
    }).sort((a, b) => b.daysLate - a.daysLate);

    return { totalCartera, totalVencida, agingChart, overdueList, totalCreditOrders: credit.length };
  }, [orders]);

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

  const fiscalSummary = useMemo(() => {
    let salesBase = 0;
    let purchasesBase = 0;
    let saleVatGenerated = 0;
    let purchaseVatPaid = 0;

    const fiscalOrders = filteredOrders.filter((order) => {
      if (invoiceFilter === 'invoiced') return order.status === 'Facturado';
      if (invoiceFilter === 'pending') return order.status !== 'Facturado';
      return true;
    });

    fiscalOrders.forEach(order => {
      order.items.forEach(item => {
        if (filterProduct !== 'all' && item.id !== filterProduct) return;

        const quantity = Number(item.quantity) || 0;
        const unitPrice = Number(item.price) || 0;
        const lineSales = unitPrice * quantity;

        const itemSaleVat = Number(item.saleVatAmountEstimated);
        const inferredSaleVat = invoicesWithVat && vatRate > 0 ? (lineSales * vatRate / 100) : 0;

        salesBase += lineSales;
        saleVatGenerated += Number.isNaN(itemSaleVat) ? inferredSaleVat : itemSaleVat;

        const itemCostBase = Number(item.costBase ?? ((item.cost || 0) - (item.purchaseVat || 0))) || 0;
        const itemPurchaseVat = Number(item.purchaseVat ?? 0) || 0;

        purchasesBase += itemCostBase * quantity;
        purchaseVatPaid += itemPurchaseVat * quantity;
      });
    });

    const vatBalance = saleVatGenerated - purchaseVatPaid;
    return {
      orderCount: fiscalOrders.length,
      salesBase,
      purchasesBase,
      saleVatGenerated,
      purchaseVatPaid,
      vatBalance,
    };
  }, [filteredOrders, filterProduct, invoicesWithVat, vatRate, invoiceFilter]);

  const handleExportFiscalCsv = () => {
    const filteredByInvoice = filteredOrders.filter((order) => {
      if (invoiceFilter === 'invoiced') return order.status === 'Facturado';
      if (invoiceFilter === 'pending') return order.status !== 'Facturado';
      return true;
    });

    const lines = [
      ['Orden', 'Fecha', 'Estado', 'Total', 'BaseVentas', 'IvaGenerado', 'BaseCompras', 'IvaCompra'].join(','),
    ];

    filteredByInvoice.forEach((order) => {
      let orderSalesBase = 0;
      let orderSaleVat = 0;
      let orderPurchaseBase = 0;
      let orderPurchaseVat = 0;

      (order.items || []).forEach((item) => {
        if (filterProduct !== 'all' && item.id !== filterProduct) return;
        const quantity = Number(item.quantity) || 0;
        const unitPrice = Number(item.price) || 0;
        const lineSales = unitPrice * quantity;

        const itemSaleVat = Number(item.saleVatAmountEstimated);
        const inferredSaleVat = invoicesWithVat && vatRate > 0 ? (lineSales * vatRate / 100) : 0;

        orderSalesBase += lineSales;
        orderSaleVat += Number.isNaN(itemSaleVat) ? inferredSaleVat : itemSaleVat;

        const itemCostBase = Number(item.costBase ?? ((item.cost || 0) - (item.purchaseVat || 0))) || 0;
        const itemPurchaseVat = Number(item.purchaseVat ?? 0) || 0;

        orderPurchaseBase += itemCostBase * quantity;
        orderPurchaseVat += itemPurchaseVat * quantity;
      });

      lines.push([
        order.orderNumber || '',
        new Date(order.createdAt).toLocaleDateString('es-CO'),
        order.status || '',
        Number(order.totalAmount || 0).toFixed(2),
        orderSalesBase.toFixed(2),
        orderSaleVat.toFixed(2),
        orderPurchaseBase.toFixed(2),
        orderPurchaseVat.toFixed(2),
      ].join(','));
    });

    lines.push([
      'TOTAL',
      '',
      '',
      '',
      fiscalSummary.salesBase.toFixed(2),
      fiscalSummary.saleVatGenerated.toFixed(2),
      fiscalSummary.purchasesBase.toFixed(2),
      fiscalSummary.purchaseVatPaid.toFixed(2),
    ].join(','));

    const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const suffix = invoiceFilter === 'invoiced' ? 'facturados' : invoiceFilter === 'pending' ? 'no_facturados' : 'todos';
    link.setAttribute('href', url);
    link.setAttribute('download', `resumen_fiscal_${suffix}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const openPaymentModal = (order) => {
    setPaymentForm({ amount: order.totalAmount || '', date: new Date().toISOString().split('T')[0], reference: '', receiptUrl: '' });
    setPaymentModal({ open: true, order });
  };

  const handleRegisterPayment = async () => {
    if (!paymentForm.amount || !paymentForm.date) return alert('Ingresa monto y fecha');
    setSavingPayment(true);
    try {
      await updateDoc(doc(db, 'orders', paymentModal.order.id), {
        status: 'Pagado',
        payment: {
          amount: parseFloat(paymentForm.amount),
          date: paymentForm.date,
          reference: paymentForm.reference,
          receiptUrl: paymentForm.receiptUrl,
          registeredAt: new Date().toISOString(),
        }
      });
      setOrders(prev => prev.map(o => o.id === paymentModal.order.id ? { ...o, status: 'Pagado' } : o));
      setPaymentModal({ open: false, order: null });
    } catch (e) {
      alert('Error al registrar pago: ' + e.message);
    } finally {
      setSavingPayment(false);
    }
  };

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

      {/* Resumen Fiscal */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-lg font-bold text-brand-dark">Resumen Fiscal del Periodo</h3>
            <p className="text-xs text-slate-400 mt-1">
              Consolidado para soporte de facturación y conciliación de IVA.
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${invoicesWithVat ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            {invoicesWithVat ? `Factura con IVA (${vatRate}%)` : 'Facturación sin IVA'}
          </span>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filtro Facturación</label>
            <select
              value={invoiceFilter}
              onChange={(e) => setInvoiceFilter(e.target.value)}
              className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-500 outline-none"
            >
              <option value="all">Todos</option>
              <option value="pending">No facturados</option>
              <option value="invoiced">Facturados</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-bold">Pedidos en cálculo: {fiscalSummary.orderCount}</span>
            <button
              type="button"
              onClick={handleExportFiscalCsv}
              className="bg-brand-dark text-white px-4 py-2 rounded-xl text-xs font-black uppercase hover:bg-brand-gold transition-all"
            >
              Exportar CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard title="Base Ventas" value={`$${fiscalSummary.salesBase.toLocaleString('es-CO')}`} color="text-brand-dark" />
          <MetricCard title="IVA Generado" value={`$${fiscalSummary.saleVatGenerated.toLocaleString('es-CO')}`} color="text-blue-600" bg="bg-blue-50" />
          <MetricCard title="Base Compras" value={`$${fiscalSummary.purchasesBase.toLocaleString('es-CO')}`} color="text-slate-600" />
          <MetricCard title="IVA Compra" value={`$${fiscalSummary.purchaseVatPaid.toLocaleString('es-CO')}`} color="text-red-600" bg="bg-red-50" />
          <MetricCard
            title="Saldo IVA"
            value={`$${fiscalSummary.vatBalance.toLocaleString('es-CO')}`}
            color={fiscalSummary.vatBalance >= 0 ? 'text-amber-700' : 'text-green-700'}
            bg={fiscalSummary.vatBalance >= 0 ? 'bg-amber-50' : 'bg-green-50'}
          />
        </div>
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
      {/* Cartera Vencida */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h3 className="text-lg font-bold text-brand-dark">Cartera de Crédito</h3>
          <div className="flex gap-6">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total en Cartera</p>
              <p className="text-xl font-black text-brand-dark">${carteraData.totalCartera.toLocaleString('es-CO')}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cartera Vencida</p>
              <p className={`text-xl font-black ${carteraData.totalVencida > 0 ? 'text-red-500' : 'text-green-600'}`}>
                ${carteraData.totalVencida.toLocaleString('es-CO')}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pedidos a Crédito</p>
              <p className="text-xl font-black text-slate-500">{carteraData.totalCreditOrders}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Aging Chart */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Antigüedad de Cartera</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={carteraData.agingChart} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                <Tooltip
                  contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  formatter={v => [`$${v.toLocaleString('es-CO')}`, 'Monto']}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={36}
                  fill="#c8a96e"
                  label={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Overdue table */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
              Pedidos Vencidos {carteraData.overdueList.length > 0 ? `(${carteraData.overdueList.length})` : ''}
            </p>
            {carteraData.overdueList.length === 0 ? (
              <div className="flex items-center justify-center h-[180px] text-slate-400 text-sm font-semibold">
                Sin cartera vencida
              </div>
            ) : (
              <div className="overflow-auto max-h-[220px] space-y-2">
                {carteraData.overdueList.map(o => (
                  <div key={o.id} className="flex items-center justify-between bg-red-50 rounded-2xl px-4 py-3 text-sm gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-brand-dark truncate">{o.customerInfo?.name || o.userEmail}</p>
                      <p className="text-[10px] text-slate-400">{o.orderNumber} · {o.creditDays || 30}d crédito</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-black text-red-500">${(o.totalAmount || 0).toLocaleString('es-CO')}</p>
                      <p className="text-[10px] text-red-400 font-bold">{o.daysLate} días vencido</p>
                    </div>
                    <button
                      onClick={() => openPaymentModal(o)}
                      className="shrink-0 bg-green-600 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-xl hover:bg-green-700 transition-all whitespace-nowrap"
                    >
                      Registrar Pago
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Registrar Pago */}
      {paymentModal.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setPaymentModal({ open: false, order: null })}>
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-black text-brand-dark mb-1">Registrar Pago</h3>
            <p className="text-xs text-slate-400 mb-6">
              {paymentModal.order?.customerInfo?.name || paymentModal.order?.userEmail} · {paymentModal.order?.orderNumber}
            </p>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monto Recibido *</label>
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3">
                  <span className="text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    value={paymentForm.amount}
                    onChange={e => setPaymentForm(p => ({ ...p, amount: e.target.value }))}
                    className="flex-1 bg-transparent outline-none font-bold text-brand-dark"
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fecha de Pago *</label>
                <input
                  type="date"
                  value={paymentForm.date}
                  onChange={e => setPaymentForm(p => ({ ...p, date: e.target.value }))}
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 outline-none font-medium text-brand-dark"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Referencia / No. Comprobante</label>
                <input
                  type="text"
                  value={paymentForm.reference}
                  onChange={e => setPaymentForm(p => ({ ...p, reference: e.target.value }))}
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 outline-none font-medium"
                  placeholder="Ej: TRF-20240423-001"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">URL Comprobante (opcional)</label>
                <input
                  type="url"
                  value={paymentForm.receiptUrl}
                  onChange={e => setPaymentForm(p => ({ ...p, receiptUrl: e.target.value }))}
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 outline-none font-medium"
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setPaymentModal({ open: false, order: null })}
                className="flex-1 py-3 rounded-2xl border border-gray-200 text-slate-500 font-bold hover:bg-gray-50 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleRegisterPayment}
                disabled={savingPayment}
                className="flex-1 py-3 rounded-2xl bg-green-600 text-white font-black uppercase hover:bg-green-700 transition-all disabled:opacity-50"
              >
                {savingPayment ? 'Guardando...' : 'Confirmar Pago'}
              </button>
            </div>
          </div>
        </div>
      )}
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
