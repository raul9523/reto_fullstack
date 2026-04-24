import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/firebase.config';
import { useUserStore } from '../store/userStore';

const ALL_MODULES = [
  { id: 'dashboard',     label: 'Dashboard / Estadísticas',    desc: 'Gráficas de ventas, métricas e indicadores' },
  { id: 'cartera',       label: 'Cartera Vencida',              desc: 'Reporte y gestión de pedidos en mora' },
  { id: 'email',         label: 'Notificaciones por Email',     desc: 'Envío automático de emails a clientes' },
  { id: 'multi_admin',   label: 'Múltiples Administradores',    desc: 'Crear y gestionar más de un admin por tienda' },
  { id: 'tallas',        label: 'Sistema de Tallas',            desc: 'Tallas por género con stock diferenciado' },
  { id: 'imagenes',      label: 'Galería de Imágenes',          desc: 'Múltiples imágenes por producto' },
  { id: 'descuentos',    label: 'Descuentos Masivos',           desc: 'Aplicar descuentos por categoría o todo el inventario' },
  { id: 'exportar',      label: 'Exportar Reportes',            desc: 'Descargar reportes en Excel/PDF' },
  { id: 'pagos_online',  label: 'Pagos en línea (Wompi)',       desc: 'Integración con pasarela Wompi' },
  { id: 'dominio',       label: 'Dominio Personalizado',        desc: 'Vincular dominio propio a la tienda' },
];

const DEFAULT_PLANS = [
  {
    id: 'gratis',
    name: 'Gratis',
    price: 0,
    trialDays: 0,
    maxProducts: 10,
    maxAdmins: 1,
    modules: { dashboard: true, imagenes: true },
    color: 'bg-gray-100',
    textColor: 'text-slate-600',
    order: 1,
  },
  {
    id: 'basico',
    name: 'Básico',
    price: 49900,
    trialDays: 5,
    maxProducts: 50,
    maxAdmins: 1,
    modules: { dashboard: true, imagenes: true, cartera: true, descuentos: true, tallas: true },
    color: 'bg-brand-gold/10',
    textColor: 'text-brand-gold',
    order: 2,
  },
  {
    id: 'profesional',
    name: 'Profesional',
    price: 99900,
    trialDays: 5,
    maxProducts: 200,
    maxAdmins: 3,
    modules: { dashboard: true, imagenes: true, cartera: true, descuentos: true, tallas: true, email: true, multi_admin: true, exportar: true },
    color: 'bg-brand-dark/5',
    textColor: 'text-brand-dark',
    order: 3,
  },
  {
    id: 'empresarial',
    name: 'Empresarial',
    price: 199900,
    trialDays: 5,
    maxProducts: -1,
    maxAdmins: -1,
    modules: Object.fromEntries(ALL_MODULES.map(m => [m.id, true])),
    color: 'bg-gradient-to-br from-brand-dark to-slate-800',
    textColor: 'text-white',
    order: 4,
  },
];

const SuperAdmin = () => {
  const { currentUser } = useUserStore();
  const [plans, setPlans] = useState([]);
  const [stores, setStores] = useState([]);
  const [activeTab, setActiveTab] = useState('planes');
  const [editingPlan, setEditingPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentUser?.role !== 'superadmin') return;
    loadData();
  }, [currentUser]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const plansSnap = await getDocs(query(collection(db, 'plans'), orderBy('order')));
      if (plansSnap.empty) {
        await seedPlans();
      } else {
        setPlans(plansSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
      const storesSnap = await getDocs(collection(db, 'subscriptions'));
      setStores(storesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  const seedPlans = async () => {
    await Promise.all(DEFAULT_PLANS.map(p => setDoc(doc(db, 'plans', p.id), p)));
    setPlans(DEFAULT_PLANS);
  };

  const handleSavePlan = async () => {
    if (!editingPlan) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'plans', editingPlan.id), editingPlan);
      setPlans(prev => prev.map(p => p.id === editingPlan.id ? editingPlan : p));
      setEditingPlan(null);
    } catch (e) {
      alert('Error: ' + e.message);
    }
    setSaving(false);
  };

  const togglePlanModule = (moduleId) => {
    setEditingPlan(prev => ({
      ...prev,
      modules: { ...prev.modules, [moduleId]: !prev.modules?.[moduleId] },
    }));
  };

  if (!currentUser || currentUser.role !== 'superadmin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-black text-brand-dark mb-2">Acceso Denegado</h1>
          <p className="text-slate-400">Esta área es exclusiva para super administradores.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-brand-dark text-white px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black tracking-tight">DÚO DREAMS · Super Admin</h1>
          <p className="text-brand-gold text-xs font-medium mt-0.5">Panel de gestión de plataforma</p>
        </div>
        <a href="/admin" className="text-white/60 hover:text-white text-xs font-bold transition-colors">← Volver</a>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 px-8">
        <div className="flex gap-0">
          {[
            { id: 'planes', label: 'Planes' },
            { id: 'tiendas', label: 'Tiendas / Suscriptores' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-4 text-xs font-black uppercase tracking-wide transition-all border-b-2 ${
                activeTab === tab.id ? 'border-brand-gold text-brand-dark' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-gold" />
          </div>
        ) : activeTab === 'planes' ? (
          <PlansTab plans={plans} onEdit={setEditingPlan} />
        ) : (
          <StoresTab stores={stores} plans={plans} />
        )}
      </div>

      {/* Edit plan modal */}
      {editingPlan && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setEditingPlan(null)}>
          <div className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl my-8" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-black text-brand-dark mb-6">Editar Plan: {editingPlan.name}</h3>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nombre del Plan</label>
                <input value={editingPlan.name} onChange={e => setEditingPlan(p => ({ ...p, name: e.target.value }))}
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 outline-none font-bold text-brand-dark focus:ring-2 focus:ring-brand-gold/30" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Precio (COP/mes)</label>
                <input type="number" value={editingPlan.price} onChange={e => setEditingPlan(p => ({ ...p, price: Number(e.target.value) }))}
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 outline-none font-bold text-brand-dark focus:ring-2 focus:ring-brand-gold/30" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Máx. Productos (-1 = Ilimitado)</label>
                <input type="number" value={editingPlan.maxProducts} onChange={e => setEditingPlan(p => ({ ...p, maxProducts: Number(e.target.value) }))}
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 outline-none font-bold" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Máx. Admins (-1 = Ilimitado)</label>
                <input type="number" value={editingPlan.maxAdmins} onChange={e => setEditingPlan(p => ({ ...p, maxAdmins: Number(e.target.value) }))}
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 outline-none font-bold" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Días de prueba gratis</label>
                <input type="number" value={editingPlan.trialDays} onChange={e => setEditingPlan(p => ({ ...p, trialDays: Number(e.target.value) }))}
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 outline-none font-bold" />
              </div>
            </div>

            {/* Modules */}
            <div className="space-y-2 mb-8">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Módulos incluidos</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ALL_MODULES.map(m => (
                  <label key={m.id} className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all border-2 ${editingPlan.modules?.[m.id] ? 'bg-brand-gold/5 border-brand-gold/30' : 'bg-gray-50 border-gray-100'}`}>
                    <input type="checkbox" checked={!!editingPlan.modules?.[m.id]} onChange={() => togglePlanModule(m.id)}
                      className="mt-0.5 w-4 h-4 accent-brand-gold cursor-pointer shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-brand-dark">{m.label}</p>
                      <p className="text-[10px] text-slate-400">{m.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setEditingPlan(null)} className="flex-1 py-3 rounded-2xl border border-gray-200 text-slate-500 font-bold hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={handleSavePlan} disabled={saving}
                className="flex-1 py-3 rounded-2xl bg-brand-dark text-white font-black uppercase hover:bg-brand-gold transition-all disabled:opacity-50">
                {saving ? 'Guardando...' : 'Guardar Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PlansTab = ({ plans, onEdit }) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-black text-brand-dark">Planes de Suscripción</h2>
      <p className="text-xs text-slate-400">Haz click en un plan para editarlo</p>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
      {plans.sort((a, b) => (a.order || 0) - (b.order || 0)).map(plan => (
        <div key={plan.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className={`p-6 ${plan.id === 'empresarial' ? 'bg-brand-dark' : 'bg-gray-50'}`}>
            <h3 className={`text-lg font-black ${plan.id === 'empresarial' ? 'text-white' : 'text-brand-dark'}`}>{plan.name}</h3>
            <p className={`text-2xl font-black mt-1 ${plan.id === 'empresarial' ? 'text-brand-gold' : 'text-brand-dark'}`}>
              {plan.price === 0 ? 'Gratis' : `$${plan.price.toLocaleString('es-CO')}`}
              {plan.price > 0 && <span className={`text-xs font-medium ml-1 ${plan.id === 'empresarial' ? 'text-white/60' : 'text-slate-400'}`}>/mes</span>}
            </p>
            {plan.trialDays > 0 && (
              <p className="text-[10px] font-bold text-brand-gold mt-1">{plan.trialDays} días gratis</p>
            )}
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-1 text-xs text-slate-500">
              <p><span className="font-bold text-brand-dark">{plan.maxProducts === -1 ? '∞' : plan.maxProducts}</span> productos</p>
              <p><span className="font-bold text-brand-dark">{plan.maxAdmins === -1 ? '∞' : plan.maxAdmins}</span> administrador{plan.maxAdmins !== 1 ? 'es' : ''}</p>
            </div>
            <div className="space-y-1">
              {ALL_MODULES.map(m => (
                <div key={m.id} className="flex items-center gap-2 text-xs">
                  {plan.modules?.[m.id]
                    ? <span className="text-green-500">✓</span>
                    : <span className="text-gray-200">✗</span>}
                  <span className={plan.modules?.[m.id] ? 'text-slate-600 font-medium' : 'text-slate-300'}>{m.label}</span>
                </div>
              ))}
            </div>
            <button onClick={() => onEdit({ ...plan })}
              className="w-full py-2 rounded-2xl bg-brand-dark text-white text-xs font-black uppercase hover:bg-brand-gold transition-all mt-2">
              Editar Plan
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const StoresTab = ({ stores, plans }) => (
  <div className="space-y-6">
    <h2 className="text-xl font-black text-brand-dark">Tiendas Suscritas</h2>
    {stores.length === 0 ? (
      <div className="text-center py-20 text-slate-400">
        <p className="text-lg font-semibold">Aún no hay suscriptores</p>
        <p className="text-sm mt-1">Cuando una tienda se registre aparecerá aquí.</p>
      </div>
    ) : (
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-[10px] uppercase tracking-widest font-bold text-slate-400">
            <tr>
              <th className="px-6 py-4">Tienda</th>
              <th className="px-6 py-4">Plan</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4">Vence</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {stores.map(s => {
              const plan = plans.find(p => p.id === s.planId);
              return (
                <tr key={s.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4">
                    <p className="font-bold text-brand-dark text-sm">{s.storeName || s.id}</p>
                    <p className="text-[10px] text-slate-400">{s.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-brand-gold">{plan?.name || s.planId}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase ${
                      s.status === 'active' ? 'bg-green-100 text-green-600' :
                      s.status === 'trial' ? 'bg-blue-100 text-blue-600' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {s.status === 'active' ? 'Activa' : s.status === 'trial' ? 'Prueba' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">
                    {s.nextBillingDate || s.trialEndsAt || '—'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-xs text-brand-gold font-bold hover:underline">Ver</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

export default SuperAdmin;
