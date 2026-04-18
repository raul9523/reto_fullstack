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
    category: 'Pijamas',
    imageUrl: '',
    discount: 0,
    isPromo: false
  });

  const [massDiscount, setMassDiscount] = useState({ category: 'all', percentage: 0 });

  const fetchData = async () => {
    setIsLoading(true);
    const pSnap = await getDocs(collection(db, 'products'));
    const ps = [];
    pSnap.forEach(doc => ps.push({ id: doc.id, ...doc.data() }));
    setProducts(ps);

    const cSnap = await getDocs(query(collection(db, 'categories'), orderBy('order', 'asc')));
    const cs = [];
    cSnap.forEach(doc => cs.push({ id: doc.id, ...doc.data() }));
    setCategories(cs);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

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
        isPromo: Boolean(formData.isPromo)
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
        name: '', description: '', price: 0, cost: 0, stockQuantity: 0, category: '', imageUrl: '', discount: 0, isPromo: false
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
      isPromo: product.isPromo || false
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
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-[10px] uppercase tracking-widest font-bold text-slate-400">
            <tr>
              <th className="px-6 py-4">Producto</th>
              <th className="px-6 py-4">Categoría</th>
              <th className="px-6 py-4">Venta / Costo</th>
              <th className="px-6 py-4">Stock</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {products.map(p => (
              <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 flex items-center gap-3">
                  <img src={p.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover bg-gray-100" />
                  <span className="font-bold text-brand-dark">{p.name}</span>
                </td>
                <td className="px-6 py-4 text-slate-500">{p.category}</td>
                <td className="px-6 py-4">
                  <div className="font-bold text-brand-dark">${p.price.toLocaleString('es-CO')}</div>
                  <div className="text-[10px] text-slate-400">Costo: ${p.cost?.toLocaleString('es-CO')}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`font-bold ${p.stockQuantity <= 0 ? 'text-red-500' : 'text-brand-dark'}`}>
                    {p.stockQuantity}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-3">
                  <button onClick={() => handleStockAdd(p, 10)} className="text-[10px] bg-green-50 text-green-600 px-2 py-1 rounded-md hover:bg-green-100 font-bold">+10 Stock</button>
                  <button onClick={() => handleEdit(p)} className="text-brand-gold font-bold hover:underline">Editar</button>
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
