import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
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
    imageUrl: ''
  });

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

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [id]: (id === 'price' || id === 'cost' || id === 'stockQuantity') ? parseFloat(value) : value 
    }));
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
        category: formData.category || (categories[0]?.name || 'Pijamas'),
        imageUrl: formData.imageUrl || ''
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
        name: '', description: '', price: 0, cost: 0, stockQuantity: 0, category: 'Pijamas', imageUrl: ''
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
      category: product.category || (categories[0]?.name || 'Pijamas'),
      imageUrl: product.imageUrl || ''
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
              {categories.map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <Input id="description" label="Descripción" value={formData.description} onChange={handleInputChange} required />
          </div>
          <Input id="price" label="Precio de Venta" type="number" value={formData.price} onChange={handleInputChange} required />
          <Input id="cost" label="Costo de Adquisición" type="number" value={formData.cost} onChange={handleInputChange} required />
          <Input id="stockQuantity" label="Stock Inicial" type="number" value={formData.stockQuantity} onChange={handleInputChange} required />
          <Input id="imageUrl" label="URL de la Imagen" placeholder="https://..." value={formData.imageUrl} onChange={handleInputChange} required />
          
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
