import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, updateDoc, addDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../../firebase/firebase.config';
import Button from '../../atoms/Button';
import Input from '../../atoms/Input';

const ProductsTab = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    cost: 0,
    stockQuantity: 0,
    category: '',
    imageUrl: '',
    discount: 0,
    isPromo: false,
    isActive: true
  });

  const [massDiscount, setMassDiscount] = useState({ category: 'all', percentage: 0 });
  const [savingId, setSavingId] = useState(null);

  const fetchData = async () => {
    setIsLoading(true);
    const pSnap = await getDocs(collection(db, 'products'));
    const ps = [];
    pSnap.forEach(doc => ps.push({ id: doc.id, ...doc.data() }));
    setProducts(ps);

    const cSnap = await getDocs(collection(db, 'categories'));
    const cs = [];
    cSnap.forEach(doc => cs.push({ id: doc.id, ...doc.data() }));
    setCategories(cs);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleQuickUpdate = async (product, field, value) => {
    setSavingId(product.id);
    try {
      const sanitizedValue = (field === 'price' || field === 'cost' || field === 'stockQuantity' || field === 'discount') 
        ? parseFloat(value) || 0 
        : value;
      
      await updateDoc(doc(db, 'products', product.id), { [field]: sanitizedValue });
      
      // Actualizar estado local sin recargar todo para velocidad
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, [field]: sanitizedValue } : p));
    } catch (e) {
      alert("Error al actualizar: " + e.message);
    } finally {
      setSavingId(null);
    }
  };

  const handleInputChange = (e) => {
    const { id, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [id]: type === 'checkbox' ? checked : (id === 'price' || id === 'cost' || id === 'stockQuantity' || id === 'discount') ? parseFloat(value) : value 
    }));
  };

  const handleApplyMassDiscount = async () => {
    if (massDiscount.percentage < 0 || massDiscount.percentage > 100) return alert("Porcentaje inválido");
    if (!confirm(`¿Aplicar ${massDiscount.percentage}% de descuento a ${massDiscount.category === 'all' ? 'TODOS los productos' : 'la categoría ' + massDiscount.category}?`)) return;

    setIsLoading(true);
    try {
      const q = massDiscount.category === 'all' 
        ? collection(db, 'products') 
        : query(collection(db, 'products'), where('category', '==', massDiscount.category));
      
      const snap = await getDocs(q);
      const batch = [];
      snap.forEach(docSnap => {
        batch.push(updateDoc(doc(db, 'products', docSnap.id), { discount: massDiscount.percentage }));
      });
      await Promise.all(batch);
      alert("Descuento masivo aplicado!");
      fetchData();
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (product) => {
    // Verificar ventas en la colección 'orders'
    setIsLoading(true);
    try {
      const ordersSnap = await getDocs(collection(db, 'orders'));
      let hasSales = false;
      
      ordersSnap.forEach(docSnap => {
        const orderData = docSnap.data();
        const items = orderData.items || [];
        if (items.some(item => item.id === product.id)) {
          hasSales = true;
        }
      });

      if (hasSales) {
        if (confirm(`El producto "${product.name}" ya tiene ventas registradas y no puede eliminarse. ¿Deseas inactivarlo para que no aparezca en la tienda?`)) {
          await updateDoc(doc(db, 'products', product.id), { isActive: false });
          fetchData();
        }
      } else {
        if (confirm(`¿Estás seguro de ELIMINAR definitivamente el producto "${product.name}"?`)) {
          await deleteDoc(doc(db, 'products', product.id));
          fetchData();
        }
      }
    } catch (e) {
      alert("Error al verificar ventas: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (product) => {
    await updateDoc(doc(db, 'products', product.id), { isActive: !product.isActive });
    fetchData();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Limpiar datos para evitar undefined en Firestore
      const sanitizedData = {
        name: formData.name || '',
        description: formData.description || '',
        price: Number(formData.price) || 0,
        cost: Number(formData.cost) || 0,
        stockQuantity: Number(formData.stockQuantity) || 0,
        category: formData.category || '', // Permitir vacío
        imageUrl: formData.imageUrl || '',
        discount: Number(formData.discount) || 0,
        isPromo: Boolean(formData.isPromo),
        isActive: formData.isActive !== false
      };

      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), sanitizedData);
      } else {
        await addDoc(collection(db, 'products'), {
          ...sanitizedData,
          createdAt: new Date().toISOString()
        });
      }
      setFormData({
        name: '', description: '', price: 0, cost: 0, stockQuantity: 0, category: '', imageUrl: '', discount: 0, isPromo: false, isActive: true
      });
      setEditingProduct(null);
      fetchData();
      alert("¡Producto guardado correctamente!");
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Error: " + error.message);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      description: product.description || '',
      price: product.price || 0,
      cost: product.cost || 0,
      stockQuantity: product.stockQuantity || 0,
      category: product.category || '',
      imageUrl: product.imageUrl || '',
      discount: product.discount || 0,
      isPromo: product.isPromo || false,
      isActive: product.isActive !== false
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStockAdd = async (product, amount) => {
    const newStock = (product.stockQuantity || 0) + amount;
    await updateDoc(doc(db, 'products', product.id), { stockQuantity: newStock });
    fetchData();
  };

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Herramienta de Descuento Masivo */}
      <div className="bg-gradient-to-r from-brand-gold/10 to-transparent p-6 rounded-3xl border border-brand-gold/20 flex flex-wrap items-center gap-6">
        <div>
          <h3 className="font-black text-brand-dark uppercase tracking-tighter">Descuento Masivo</h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase">Aplica promociones a todo el inventario</p>
        </div>
        <div className="flex gap-2 items-center bg-white p-2 rounded-2xl shadow-sm">
          <select 
            value={massDiscount.category} 
            onChange={(e) => setMassDiscount(prev => ({ ...prev, category: e.target.value }))}
            className="text-xs font-bold px-3 py-2 bg-gray-50 rounded-xl outline-none border-none"
          >
            <option value="all">Todo el Inventario</option>
            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          <div className="flex items-center gap-1 bg-gray-50 px-3 py-2 rounded-xl">
            <input 
              type="number" 
              placeholder="0"
              value={massDiscount.percentage}
              onChange={(e) => setMassDiscount(prev => ({ ...prev, percentage: parseFloat(e.target.value) }))}
              className="w-10 bg-transparent text-center font-black text-brand-gold outline-none"
            />
            <span className="text-xs font-black text-brand-gold">%</span>
          </div>
          <button 
            onClick={handleApplyMassDiscount}
            className="bg-brand-dark text-white px-4 py-2 rounded-xl text-xs font-black uppercase hover:bg-brand-gold transition-all"
          >
            Aplicar
          </button>
          <button 
            onClick={() => {
              if(confirm("¿Estás seguro de quitar TODOS los descuentos?")) {
                setMassDiscount({ ...massDiscount, percentage: 0 });
                handleApplyMassDiscount();
              }
            }}
            className="border border-red-200 text-red-500 px-4 py-2 rounded-xl text-xs font-bold uppercase hover:bg-red-50 transition-all"
          >
            Quitar Descuentos
          </button>
        </div>
      </div>

      {/* Formulario */}
      <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
        <h2 className="text-xl font-bold text-brand-dark mb-6">
          {editingProduct ? 'Editar Producto' : 'Crear Nuevo Producto'}
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input id="name" label="Nombre" value={formData.name} onChange={handleInputChange} required />
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase ml-1">Categoría</label>
            <select 
              id="category" 
              value={formData.category} 
              onChange={handleInputChange}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-brand-gold transition-all"
            >
              <option value="">Sin Categoría</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <Input id="description" label="Descripción" value={formData.description} onChange={handleInputChange} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input id="price" label="Precio de Venta" type="number" value={formData.price} onChange={handleInputChange} required />
            <Input id="discount" label="% Descuento" type="number" value={formData.discount} onChange={handleInputChange} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input id="cost" label="Costo de Adquisición" type="number" value={formData.cost} onChange={handleInputChange} required />
            <Input id="stockQuantity" label="Stock Inicial" type="number" value={formData.stockQuantity} onChange={handleInputChange} required />
          </div>
          <Input id="imageUrl" label="URL de la Imagen" placeholder="https://..." value={formData.imageUrl} onChange={handleInputChange} required />
          
          <div className="flex items-center gap-2 pt-4">
            <input 
              type="checkbox" 
              id="isPromo" 
              checked={formData.isPromo}
              onChange={handleInputChange}
              className="w-5 h-5 accent-brand-gold"
            />
            <label htmlFor="isPromo" className="text-sm font-bold text-brand-dark cursor-pointer">Marcar como PROMOCIÓN (Aparece primero)</label>
          </div>

          <div className="md:col-span-2 flex justify-end gap-3 pt-4">
            {editingProduct && (
              <Button variant="secondary" onClick={() => {
                setEditingProduct(null);
                setFormData({ name: '', description: '', price: 0, cost: 0, stockQuantity: 0, category: 'Pijamas', imageUrl: '' });
              }}>
                Cancelar
              </Button>
            )}
            <Button type="submit">
              {editingProduct ? 'Actualizar Producto' : 'Crear Producto'}
            </Button>
          </div>
        </form>
      </div>

      {/* Lista de Productos */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 text-[10px] uppercase tracking-widest font-bold text-slate-400">
            <tr>
              <th className="px-6 py-4">Producto</th>
              <th className="px-6 py-4">Categoría</th>
              <th className="px-6 py-4">Stock</th>
              <th className="px-6 py-4">Venta</th>
              <th className="px-6 py-4">Costo</th>
              <th className="px-6 py-4">% Desc</th>
              <th className="px-6 py-4">Promo</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {products.map(p => (
              <tr key={p.id} className={`hover:bg-gray-50/50 transition-colors ${!p.isActive ? 'opacity-60 grayscale' : ''}`}>
                <td className="px-6 py-4 flex items-center gap-3">
                  <img src={p.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover bg-gray-100" />
                  <div>
                    <span className="font-bold text-brand-dark block text-xs truncate max-w-[120px]">{p.name}</span>
                  </div>
                </td>
                
                <td className="px-4 py-2">
                  <select 
                    value={p.category || ''}
                    onChange={(e) => handleQuickUpdate(p, 'category', e.target.value)}
                    className="text-xs bg-gray-50 border-none rounded-lg p-1 outline-none focus:ring-1 focus:ring-brand-gold w-full"
                  >
                    <option value="">Sin Cat.</option>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </td>

                <td className="px-4 py-2">
                  <input 
                    type="number"
                    value={p.stockQuantity}
                    onChange={(e) => handleQuickUpdate(p, 'stockQuantity', Number(e.target.value))}
                    className="w-16 text-xs bg-gray-50 border-none rounded-lg p-1 font-bold text-center"
                  />
                </td>

                <td className="px-4 py-2">
                  <div className="flex items-center gap-1 bg-gray-50 rounded-lg px-2 py-1">
                    <span className="text-[10px] text-slate-400">$</span>
                    <input 
                      type="number"
                      value={p.price}
                      onChange={(e) => handleQuickUpdate(p, 'price', Number(e.target.value))}
                      className="w-20 text-xs bg-transparent border-none font-bold outline-none"
                    />
                  </div>
                </td>

                <td className="px-4 py-2">
                  <div className="flex items-center gap-1 bg-gray-50 rounded-lg px-2 py-1 border border-dashed border-gray-200">
                    <span className="text-[10px] text-slate-400">$</span>
                    <input 
                      type="number"
                      value={p.cost || 0}
                      onChange={(e) => handleQuickUpdate(p, 'cost', Number(e.target.value))}
                      className="w-20 text-xs bg-transparent border-none font-medium outline-none text-slate-500"
                    />
                  </div>
                </td>

                <td className="px-4 py-2">
                  <div className="flex items-center gap-1">
                    <input 
                      type="number"
                      value={p.discount || 0}
                      onChange={(e) => handleQuickUpdate(p, 'discount', Number(e.target.value))}
                      className="w-12 text-xs bg-brand-gold/5 text-brand-gold border-none rounded-lg p-1 font-black text-center"
                    />
                    <span className="text-[10px] text-brand-gold">%</span>
                  </div>
                </td>

                <td className="px-4 py-2 text-center">
                  <input 
                    type="checkbox"
                    checked={p.isPromo}
                    onChange={(e) => handleQuickUpdate(p, 'isPromo', e.target.checked)}
                    className="w-4 h-4 accent-brand-gold cursor-pointer"
                  />
                </td>

                <td className="px-4 py-2">
                  <button 
                    onClick={() => handleToggleActive(p)}
                    className={`px-2 py-1 rounded-full text-[9px] font-black uppercase transition-all ${p.isActive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
                  >
                    {p.isActive ? 'Activo' : 'Inactivo'}
                  </button>
                </td>

                <td className="px-6 py-4 text-right flex items-center justify-end gap-3">
                  {savingId === p.id ? (
                    <div className="animate-spin h-4 w-4 border-2 border-brand-gold border-t-transparent rounded-full"></div>
                  ) : (
                    <>
                      <button onClick={() => handleEdit(p)} className="p-2 hover:bg-brand-gold/10 rounded-full transition-colors group" title="Editar Detalles">
                        <svg className="w-4 h-4 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      <button onClick={() => handleDelete(p)} className="p-2 hover:bg-red-50 rounded-full transition-colors group" title="Eliminar">
                        <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductsTab;
