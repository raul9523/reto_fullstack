import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '../../../store/settingsStore';
import Button from '../../atoms/Button';
import Input from '../../atoms/Input';

const SettingsTab = () => {
  const { settings, fetchSettings, updateSettings, isLoading } = useSettingsStore();
  const [localSettings, setLocalSettings] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const handleTogglePayment = (method) => {
    setLocalSettings(prev => ({
      ...prev,
      paymentMethods: {
        ...prev.paymentMethods,
        [method]: !prev.paymentMethods[method]
      }
    }));
  };

  const handleSave = async () => {
    try {
      await updateSettings(localSettings);
      alert("Configuración guardada correctamente.");
    } catch (error) {
      alert("Error al guardar.");
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
            onChange={(e) => setLocalSettings({...localSettings, logoUrl: e.target.value})}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Envíos */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Envíos</h3>
          <Input 
            label="Costo de Envío Estándar"
            type="number"
            value={localSettings.shippingCost}
            onChange={(e) => setLocalSettings({...localSettings, shippingCost: parseInt(e.target.value)})}
          />
          <label className="flex items-center justify-between p-3 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-brand-dark">Cobro contra entrega (Flete)</span>
              <span className="text-[10px] text-slate-400">El cliente paga el envío al recibir.</span>
            </div>
            <input 
              type="checkbox" 
              checked={localSettings.shippingOnDelivery}
              onChange={() => setLocalSettings({...localSettings, shippingOnDelivery: !localSettings.shippingOnDelivery})}
              className="w-5 h-5 rounded text-brand-gold focus:ring-brand-gold"
            />
          </label>
          <p className="text-xs text-slate-400 italic">Este valor se sumará al total en el checkout si el cobro contra entrega está desactivado.</p>
        </div>

        {/* Métodos de Pago */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Métodos de Pago Habilitados</h3>
          <div className="space-y-2">
            {Object.keys(localSettings.paymentMethods).map(method => (
              <label key={method} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                <span className="text-sm font-medium capitalize text-brand-dark">{method}</span>
                <input 
                  type="checkbox" 
                  checked={localSettings.paymentMethods[method]}
                  onChange={() => handleTogglePayment(method)}
                  className="w-5 h-5 rounded text-brand-gold focus:ring-brand-gold"
                />
              </label>
            ))}
          </div>
        </div>
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
