import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../firebase/firebase.config';
import { useSettingsStore } from '../../../store/settingsStore';
import Button from '../../atoms/Button';
import Input from '../../atoms/Input';

const EMAIL_NOTIFICATION_LABELS = {
  onOrderPlaced:      { label: 'Pedido Realizado',  desc: 'Cuando el cliente finaliza el pago o envía comprobante.' },
  onPaymentConfirmed: { label: 'Pago Confirmado',   desc: 'Cuando el admin valida el comprobante de transferencia.' },
  onDispatched:       { label: 'Pedido Despachado', desc: 'Cuando se ingresa la guía y el pedido se marca despachado.' },
};

const EMPTY_METHOD = { label: '', icon: '💳', description: '' };

const SettingsTab = () => {
  const { settings, fetchSettings, updateSettings, isLoading } = useSettingsStore();
  const [localSettings, setLocalSettings] = useState(null);
  const [showPass, setShowPass] = useState(false);

  // Payment methods state (Firestore-backed)
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [pmLoading, setPmLoading] = useState(true);
  const [showAddMethod, setShowAddMethod] = useState(false);
  const [newMethod, setNewMethod] = useState(EMPTY_METHOD);
  const [savingMethod, setSavingMethod] = useState(false);

  useEffect(() => {
    fetchSettings();
    loadPaymentMethods();
  }, [fetchSettings]);

  useEffect(() => {
    if (settings) setLocalSettings(settings);
  }, [settings]);

  const loadPaymentMethods = async () => {
    setPmLoading(true);
    try {
      const snap = await getDocs(collection(db, 'payment_methods'));
      const methods = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
      setPaymentMethods(methods);
    } catch (err) {
      console.error('Error cargando métodos de pago:', err);
    } finally {
      setPmLoading(false);
    }
  };

  const handleTogglePayment = (methodId) => {
    setLocalSettings(prev => ({
      ...prev,
      paymentMethods: {
        ...prev.paymentMethods,
        [methodId]: !(prev.paymentMethods?.[methodId] ?? true)
      }
    }));
  };

  const handleToggleEmailNotif = (key) => {
    setLocalSettings(prev => ({
      ...prev,
      emailNotifications: {
        ...prev.emailNotifications,
        [key]: !prev.emailNotifications?.[key]
      }
    }));
  };

  const handleAddMethod = async () => {
    if (!newMethod.label.trim()) return alert('El nombre es obligatorio.');
    setSavingMethod(true);
    try {
      const id = newMethod.label.trim()
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');

      if (!id) return alert('Nombre no válido para generar un ID.');

      const methodData = {
        label: newMethod.label.trim(),
        icon: newMethod.icon || '💳',
        description: newMethod.description.trim(),
        order: paymentMethods.length + 1,
      };

      await setDoc(doc(db, 'payment_methods', id), methodData);

      // Also add the toggle to settings (enabled by default)
      const updatedSettings = {
        ...localSettings,
        paymentMethods: { ...localSettings.paymentMethods, [id]: true }
      };
      await updateSettings(updatedSettings);
      setLocalSettings(updatedSettings);

      setPaymentMethods(prev => [...prev, { id, ...methodData }]);
      setNewMethod(EMPTY_METHOD);
      setShowAddMethod(false);
    } catch (err) {
      alert('Error al agregar el método: ' + err.message);
    } finally {
      setSavingMethod(false);
    }
  };

  const handleDeleteMethod = async (methodId) => {
    if (!confirm(`¿Eliminar el método "${methodId}"? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteDoc(doc(db, 'payment_methods', methodId));

      const { [methodId]: _, ...remainingToggles } = localSettings.paymentMethods ?? {};
      const updatedSettings = { ...localSettings, paymentMethods: remainingToggles };
      await updateSettings(updatedSettings);
      setLocalSettings(updatedSettings);

      setPaymentMethods(prev => prev.filter(m => m.id !== methodId));
    } catch (err) {
      alert('Error al eliminar: ' + err.message);
    }
  };

  const handleSave = async () => {
    try {
      await updateSettings(localSettings);
      alert('Configuración guardada correctamente.');
    } catch {
      alert('Error al guardar.');
    }
  };

  if (!localSettings) return <div>Cargando...</div>;

  return (
    <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-8 animate-fade-in">
      <h2 className="text-xl font-bold text-brand-dark">Configuración Global de la Tienda</h2>

      {/* Identidad de Marca */}
      <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-6">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Identidad de Marca</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <Input
            label="URL del Logo de la Web"
            placeholder="https://ejemplo.com/logo.png"
            value={localSettings.logoUrl || ''}
            onChange={(e) => setLocalSettings({ ...localSettings, logoUrl: e.target.value })}
          />
          <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-dashed border-gray-200 min-h-[120px]">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-3">Previsualización del Logo</p>
            {localSettings.logoUrl ? (
              <img
                src={localSettings.logoUrl}
                alt="Logo Preview"
                className="max-h-16 object-contain"
                onError={(e) => { e.target.src = ''; alert('URL de imagen no válida'); }}
              />
            ) : (
              <div className="text-xs text-slate-300 italic">No hay logo configurado</div>
            )}
          </div>
        </div>
      </div>

      {/* Envíos */}
      <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-4">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Envíos</h3>
        <Input
          label="Costo de Envío Estándar"
          type="number"
          value={localSettings.shippingCost}
          onChange={(e) => setLocalSettings({ ...localSettings, shippingCost: parseInt(e.target.value) })}
        />
        <label className="flex items-center justify-between p-3 border border-gray-100 rounded-xl cursor-pointer hover:bg-white transition-colors bg-white">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-brand-dark">Cobro contra entrega (Flete)</span>
            <span className="text-[10px] text-slate-400">El cliente paga el envío al recibir.</span>
          </div>
          <input
            type="checkbox"
            checked={localSettings.shippingOnDelivery}
            onChange={() => setLocalSettings({ ...localSettings, shippingOnDelivery: !localSettings.shippingOnDelivery })}
            className="w-5 h-5 rounded text-brand-gold focus:ring-brand-gold"
          />
        </label>
        <p className="text-xs text-slate-400 italic">Este valor se sumará al total en el checkout si el cobro contra entrega está desactivado.</p>
      </div>

      {/* Métodos de Pago */}
      <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Métodos de Pago</h3>
          <button
            type="button"
            onClick={() => setShowAddMethod(v => !v)}
            className="text-xs font-bold text-brand-gold hover:text-brand-dark transition-colors border border-brand-gold/30 hover:border-brand-gold px-3 py-1 rounded-lg"
          >
            {showAddMethod ? 'Cancelar' : '+ Agregar método'}
          </button>
        </div>

        {showAddMethod && (
          <div className="bg-white border border-brand-gold/20 rounded-2xl p-5 space-y-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nuevo Método</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Input
                  label="Nombre del método"
                  placeholder="Ej: Nequi, Daviplata, Efecty…"
                  value={newMethod.label}
                  onChange={(e) => setNewMethod(p => ({ ...p, label: e.target.value }))}
                />
              </div>
              <Input
                label="Ícono (emoji)"
                placeholder="💳"
                value={newMethod.icon}
                onChange={(e) => setNewMethod(p => ({ ...p, icon: e.target.value }))}
              />
            </div>
            <Input
              label="Descripción (opcional)"
              placeholder="Instrucciones o descripción breve para el cliente"
              value={newMethod.description}
              onChange={(e) => setNewMethod(p => ({ ...p, description: e.target.value }))}
            />
            <div className="flex justify-end">
              <Button onClick={handleAddMethod} disabled={savingMethod}>
                {savingMethod ? 'Guardando…' : 'Guardar método'}
              </Button>
            </div>
          </div>
        )}

        {pmLoading ? (
          <p className="text-xs text-slate-400">Cargando métodos…</p>
        ) : paymentMethods.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No hay métodos de pago configurados.</p>
        ) : (
          <div className="space-y-2">
            {paymentMethods.map(method => (
              <div key={method.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl bg-white hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{method.icon}</span>
                  <div>
                    <span className="text-sm font-bold text-brand-dark">{method.label}</span>
                    {method.description && (
                      <p className="text-[10px] text-slate-400">{method.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-[10px] text-slate-400">{(localSettings.paymentMethods?.[method.id] ?? true) ? 'Activo' : 'Inactivo'}</span>
                    <input
                      type="checkbox"
                      checked={localSettings.paymentMethods?.[method.id] ?? true}
                      onChange={() => handleTogglePayment(method.id)}
                      className="w-4 h-4 rounded text-brand-gold focus:ring-brand-gold"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => handleDeleteMethod(method.id)}
                    className="text-[10px] text-red-400 hover:text-red-600 font-bold transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-slate-400 italic">Los cambios de activar/desactivar se guardan con el botón principal.</p>
      </div>

      {/* Notificaciones por Correo */}
      <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-6">
        <div>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Notificaciones por Correo</h3>
          <p className="text-xs text-slate-400 mt-1">
            Usa una <span className="font-semibold">Contraseña de Aplicación</span> de Gmail — no la contraseña normal.
            Créala en: cuenta Google → Seguridad → Verificación en 2 pasos → Contraseñas de aplicación.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Correo remitente (Gmail)"
            type="email"
            placeholder="tienda@gmail.com"
            value={localSettings.emailConfig?.user || ''}
            onChange={(e) => setLocalSettings(prev => ({
              ...prev,
              emailConfig: { ...prev.emailConfig, user: e.target.value }
            }))}
          />
          <div className="relative">
            <Input
              label="Contraseña de Aplicación"
              type={showPass ? 'text' : 'password'}
              placeholder="xxxx xxxx xxxx xxxx"
              value={localSettings.emailConfig?.pass || ''}
              onChange={(e) => setLocalSettings(prev => ({
                ...prev,
                emailConfig: { ...prev.emailConfig, pass: e.target.value }
              }))}
            />
            <button
              type="button"
              onClick={() => setShowPass(v => !v)}
              className="absolute right-3 bottom-3 text-xs text-slate-400 hover:text-brand-gold transition-colors"
            >
              {showPass ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">¿En qué pasos enviar correo al cliente?</p>
          {Object.entries(EMAIL_NOTIFICATION_LABELS).map(([key, { label, desc }]) => (
            <label key={key} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl cursor-pointer hover:bg-white transition-colors bg-white">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-brand-dark">{label}</span>
                <span className="text-[10px] text-slate-400">{desc}</span>
              </div>
              <input
                type="checkbox"
                checked={localSettings.emailNotifications?.[key] ?? true}
                onChange={() => handleToggleEmailNotif(key)}
                className="w-5 h-5 rounded text-brand-gold focus:ring-brand-gold flex-shrink-0 ml-4"
              />
            </label>
          ))}
        </div>

        {!localSettings.emailConfig?.user && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl p-3">
            Sin correo configurado, las notificaciones por email están desactivadas aunque estén marcadas arriba.
          </p>
        )}
      </div>

      <div className="pt-6 border-t border-gray-50 flex justify-end">
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? 'Guardando...' : 'Guardar Configuración'}
        </Button>
      </div>
    </div>
  );
};

export default SettingsTab;
