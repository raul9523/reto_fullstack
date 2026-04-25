import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../../../firebase/firebase.config';
import Button from '../../atoms/Button';
import Input from '../../atoms/Input';
import { useSettingsStore } from '../../../store/settingsStore';
import { getSizesForGenderType, getSizeStockKey } from '../../../constants/sizes';

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

  // Size picker state
  const [sizePickerProduct, setSizePickerProduct] = useState(null);
  const [pickedGender, setPickedGender] = useState('');
  const [pickedSize, setPickedSize] = useState('');

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
    if (settings.shippingCost > 0 && !settings.shippingOnDelivery) {
      setChargeShipping(true);
    }
  }, [settings.shippingCost, settings.shippingOnDelivery]);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openSizePicker = (product) => {
    setSizePickerProduct(product);
    const defaultGender = product.genders?.[0] || '';
    setPickedGender(defaultGender);
    setPickedSize('');
  };

  const confirmSizePick = () => {
    if (!pickedGender || !pickedSize) return;
    addItem(sizePickerProduct, pickedGender, pickedSize);
    setSizePickerProduct(null);
    setPickedGender('');
    setPickedSize('');
  };

  const getSizeStock = (product, gender, size) => {
    if (!product.sizeStock) return 0;
    const key = (product.genders?.length > 1) ? getSizeStockKey(gender, size) : size;
    return product.sizeStock[key] ?? 0;
  };

  const pickerSizes = sizePickerProduct && pickedGender
    ? getSizesForGenderType(pickedGender, sizePickerProduct.sizeType)
    : [];

  const addItem = (product, gender = null, size = null) => {
    const cartKey = gender && size ? `${product.id}_${gender}_${size}` : product.id;
    const existing = selectedItems.find(item => item.cartKey === cartKey);
    if (existing) {
      setSelectedItems(selectedItems.map(item =>
        item.cartKey === cartKey ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setSelectedItems([...selectedItems, {
        ...product, quantity: 1, cartKey, selectedGender: gender, selectedSize: size
      }]);
    }
  };

  const removeItem = (cartKey) => {
    setSelectedItems(selectedItems.filter(item => item.cartKey !== cartKey));
  };

  const updateQty = (cartKey, delta) => {
    setSelectedItems(selectedItems.map(item => {
      if (item.cartKey === cartKey) {
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
          selectedGender: item.selectedGender || null,
          selectedSize: item.selectedSize || null,
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
      {/* Modal selector de talla */}
      {sizePickerProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-5">
              <img src={sizePickerProduct.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover" />
              <div>
                <h3 className="font-bold text-brand-dark text-sm">{sizePickerProduct.name}</h3>
                <p className="text-[10px] text-slate-400">${sizePickerProduct.price.toLocaleString()}</p>
              </div>
            </div>

            {/* Selector de género si hay más de uno */}
            {(sizePickerProduct.genders?.length > 1) && (
              <div className="mb-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Género</p>
                <div className="flex gap-2 flex-wrap">
                  {sizePickerProduct.genders.map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => { setPickedGender(g); setPickedSize(''); }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${pickedGender === g ? 'bg-brand-dark text-white' : 'bg-gray-100 text-slate-600 hover:bg-gray-200'}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Grid de tallas */}
            <div className="mb-5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                Talla <span className="text-slate-300 normal-case">({sizePickerProduct.sizeType})</span>
              </p>
              {pickerSizes.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {pickerSizes.map(size => {
                    const stock = getSizeStock(sizePickerProduct, pickedGender, size);
                    return (
                      <button
                        key={size}
                        type="button"
                        disabled={stock === 0}
                        onClick={() => setPickedSize(size)}
                        className={`py-2 rounded-xl text-xs font-bold transition-all ${
                          pickedSize === size
                            ? 'bg-brand-gold text-white'
                            : stock === 0
                            ? 'bg-gray-50 text-gray-300 cursor-not-allowed line-through'
                            : 'bg-gray-100 text-slate-700 hover:bg-gray-200'
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400">Sin tallas disponibles para este género</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSizePickerProduct(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-gray-100 hover:bg-gray-200 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmSizePick}
                disabled={!pickedGender || !pickedSize}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-brand-dark hover:bg-brand-gold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

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
                  <p className="text-[10px] text-slate-400">
                    Stock: {p.stockQuantity} | ${p.price.toLocaleString()}
                    {p.handlesSizes && <span className="ml-1 text-brand-gold font-bold">· Con tallas</span>}
                  </p>
                </div>
              </div>
              <button
                onClick={() => p.handlesSizes ? openSizePicker(p) : addItem(p)}
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
              <div key={item.cartKey} className="flex justify-between items-center text-sm">
                <div className="flex-1">
                  <p className="font-bold text-brand-dark">{item.name}</p>
                  {item.selectedGender && item.selectedSize && (
                    <p className="text-[10px] text-brand-gold font-bold">{item.selectedGender} · {item.selectedSize}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => updateQty(item.cartKey, -1)} className="text-brand-gold font-bold">-</button>
                    <span className="text-[10px]">{item.quantity}</span>
                    <button type="button" onClick={() => updateQty(item.cartKey, 1)} className="text-brand-gold font-bold">+</button>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold">${(item.price * item.quantity).toLocaleString()}</span>
                  <button type="button" onClick={() => removeItem(item.cartKey)} className="text-red-400">×</button>
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
