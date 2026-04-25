import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import { db } from '../../../firebase/firebase.config';
import Button from '../../atoms/Button';
import Input from '../../atoms/Input';
import { useSettingsStore } from '../../../store/settingsStore';

const CreateOrderTab = () => {
  const { settings, fetchSettings } = useSettingsStore();
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    department: 'Antioquia',
    city: 'Medellín'
  });
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [creditDays, setCreditDays] = useState(30);
  const [chargeShipping, setChargeShipping] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchSettings();
    const fetchProducts = async () => {
      const querySnapshot = await getDocs(collection(db, 'products'));
      const prods = [];
      querySnapshot.forEach(doc => prods.push({ id: doc.id, ...doc.data() }));
      setProducts(prods);
    };
    fetchProducts();
  }, [fetchSettings]);

  useEffect(() => {
    // Default: charge shipping only when global settings have a cost and it's not free delivery
    if (settings.shippingCost > 0 && !settings.shippingOnDelivery) {
      setChargeShipping(true);
    }
  }, [settings.shippingCost, settings.shippingOnDelivery]);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addItem = (product) => {
    const existing = selectedItems.find(item => item.id === product.id);
    if (existing) {
      setSelectedItems(selectedItems.map(item => 
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setSelectedItems([...selectedItems, { ...product, quantity: 1 }]);
    }
  };

  const removeItem = (id) => {
    setSelectedItems(selectedItems.filter(item => item.id !== id));
  };

  const updateQty = (id, delta) => {
    setSelectedItems(selectedItems.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const subtotal = selectedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const shipping = chargeShipping ? (settings.shippingCost || 0) : 0;
  const total = subtotal + shipping;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedItems.length === 0) return alert("Selecciona al menos un producto");
    
    setIsSubmitting(true);
    try {
      const taxSettings = {
        invoicesWithVat: !!settings.tax?.invoicesWithVat,
        vatRate: Number(settings.tax?.vatRate) || 0,
      };
      const orderId = `MAN-${Date.now().toString().slice(-6)}`;
      const orderData = {
        orderNumber: orderId,
        userId: 'admin_manual',
        userEmail: customerInfo.email || 'cliente_manual@duodreams.com',
        customerInfo,
        items: selectedItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          costBase: Number(item.costBase ?? item.cost ?? 0) || 0,
          purchaseVat: Number(item.purchaseVat ?? 0) || 0,
          cost: (Number(item.costBase ?? item.cost ?? 0) || 0) + (Number(item.purchaseVat ?? 0) || 0),
          saleVatRate: taxSettings.invoicesWithVat ? taxSettings.vatRate : 0,
          saleVatAmountEstimated: taxSettings.invoicesWithVat ? ((Number(item.price) || 0) * item.quantity * taxSettings.vatRate / 100) : 0,
          quantity: item.quantity,
          category: item.category,
          isBackorder: item.stockQuantity === 0
        })),
        subtotal,
        shippingCost: shipping,
        shippingOnDelivery: !chargeShipping,
        totalAmount: total,
        taxConfigSnapshot: taxSettings,
        paymentMethod,
        creditDays: paymentMethod === 'credito' ? creditDays : null,
        status: paymentMethod === 'credito' ? 'Por Cobrar' : 'Pagado',
        isManual: true,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'orders'), orderData);
      alert(`Orden ${orderId} creada con éxito`);
      setSelectedItems([]);
      setCustomerInfo({ name: '', email: '', phone: '', address: '', department: 'Antioquia', city: 'Medellín' });
    } catch (error) {
      console.error(error);
      alert("Error al crear la orden");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
      {/* Selector de Productos */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <h2 className="text-xl font-bold text-brand-dark mb-6">1. Seleccionar Productos</h2>
        <Input 
          placeholder="Buscar producto..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-6"
        />
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 no-scrollbar">
          {filteredProducts.map(p => (
            <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-3">
                <img src={p.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
                <div>
                  <p className="text-sm font-bold text-brand-dark">{p.name}</p>
                  <p className="text-[10px] text-slate-400">Stock: {p.stockQuantity} | ${p.price.toLocaleString()}</p>
                </div>
              </div>
              <button 
                onClick={() => addItem(p)}
                className="w-8 h-8 bg-brand-gold text-white rounded-full flex items-center justify-center font-bold hover:bg-brand-dark"
              >
                +
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Formulario de Orden */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
        <h2 className="text-xl font-bold text-brand-dark">2. Datos del Cliente y Pago</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <Input label="Nombre" value={customerInfo.name} onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})} required />
          <Input label="Teléfono" value={customerInfo.phone} onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value})} required />
        </div>
        <Input label="Email (Opcional)" value={customerInfo.email} onChange={e => setCustomerInfo({...customerInfo, email: e.target.value})} />
        <Input label="Dirección" value={customerInfo.address} onChange={e => setCustomerInfo({...customerInfo, address: e.target.value})} required />

        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div
            onClick={() => setChargeShipping(v => !v)}
            className={`relative w-10 h-5 rounded-full transition-colors ${chargeShipping ? 'bg-brand-gold' : 'bg-gray-200'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${chargeShipping ? 'translate-x-5' : ''}`} />
          </div>
          <span className="text-sm font-semibold text-brand-dark">
            Cobrar envío {chargeShipping && settings.shippingCost > 0 ? `($${(settings.shippingCost).toLocaleString()})` : ''}
          </span>
        </label>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Forma de Pago</label>
            <select 
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-sm font-bold outline-none"
            >
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="credito">Crédito</option>
              <option value="pse">PSE</option>
            </select>
          </div>
          {paymentMethod === 'credito' && (
            <Input 
              label="Días de Crédito" 
              type="number" 
              value={creditDays} 
              onChange={e => setCreditDays(parseInt(e.target.value))} 
            />
          )}
        </div>

        {/* Resumen de Items Seleccionados */}
        <div className="border-t border-gray-100 pt-4">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Resumen de Orden</h3>
          <div className="space-y-2 max-h-[200px] overflow-y-auto mb-4">
            {selectedItems.map(item => (
              <div key={item.id} className="flex justify-between items-center text-sm">
                <div className="flex-1">
                  <p className="font-bold text-brand-dark">{item.name}</p>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => updateQty(item.id, -1)} className="text-brand-gold font-bold">-</button>
                    <span className="text-[10px]">{item.quantity}</span>
                    <button type="button" onClick={() => updateQty(item.id, 1)} className="text-brand-gold font-bold">+</button>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold">${(item.price * item.quantity).toLocaleString()}</span>
                  <button type="button" onClick={() => removeItem(item.id)} className="text-red-400">×</button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="bg-gray-50 p-4 rounded-2xl space-y-2">
            <div className="flex justify-between text-xs text-slate-500 font-bold">
              <span>Subtotal</span>
              <span>${subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500 font-bold">
              <span>Envío {!chargeShipping ? '(Sin cobro)' : ''}</span>
              <span>${shipping.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-lg font-black text-brand-dark pt-2 border-t border-gray-200">
              <span>TOTAL</span>
              <span>${total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <Button className="w-full py-4" disabled={isSubmitting}>
          {isSubmitting ? 'Creando...' : 'Finalizar y Crear Orden'}
        </Button>
      </form>
    </div>
  );
};

export default CreateOrderTab;
