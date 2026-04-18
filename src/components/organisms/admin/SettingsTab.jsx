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
          <p className="text-xs text-slate-400 italic">Este valor se sumará al total en el checkout.</p>
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
