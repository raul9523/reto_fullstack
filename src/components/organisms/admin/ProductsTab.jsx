import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../../../firebase/firebase.config';
import Button from '../../atoms/Button';
import Input from '../../atoms/Input';
import { GENDERS, SIZE_TYPES_BY_GENDER, getSizesForGenderType, getSizeStockKey } from '../../../constants/sizes';

const EMPTY_FORM = {
  name: '', description: '', price: 0, costBase: 0, purchaseVat: 0, stockQuantity: 0,
  category: '', imageUrl: '', images: [],
  discount: 0, isPromo: false, isActive: true,
  handlesSizes: false, genders: [], sizeType: '', sizeStock: {},
};

const ProductsTab = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [massDiscount, setMassDiscount] = useState({ category: 'all', percentage: 0 });
  const [savingId, setSavingId] = useState(null);

  // A4 — bulk selection
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  // A5 — search
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  // B6 — new image URL input
  const [newImageUrl, setNewImageUrl] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    const pSnap = await getDocs(collection(db, 'products'));
    setProducts(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    const cSnap = await getDocs(collection(db, 'categories'));
    setCategories(cSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Filtered product list
  const visibleProducts = useMemo(() => {
    let list = products;
    if (filterCategory !== 'all') list = list.filter(p => p.category === filterCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
    }
    return list;
  }, [products, search, filterCategory]);

  // Size helpers
  const activeGenders = formData.genders || [];
  const availableSizeTypes = useMemo(() => {
    const types = new Set();
    activeGenders.forEach(g => (SIZE_TYPES_BY_GENDER[g] || []).forEach(t => types.add(t)));
    return [...types];
  }, [activeGenders]);

  const sizesForCurrentType = useMemo(() => {
    if (!formData.handlesSizes || !formData.sizeType) return [];
    const allSizes = new Set();
    activeGenders.forEach(g => getSizesForGenderType(g, formData.sizeType).forEach(s => allSizes.add(s)));
    return [...allSizes];
  }, [formData.handlesSizes, formData.sizeType, activeGenders]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleQuickUpdate = async (product, field, value) => {
    setSavingId(product.id);
    try {
      const numericFields = ['price', 'cost', 'costBase', 'purchaseVat', 'stockQuantity', 'discount'];
      const sanitized = numericFields.includes(field) ? parseFloat(value) || 0 : value;

      if (field === 'costBase' || field === 'purchaseVat') {
        const nextCostBase = field === 'costBase' ? sanitized : Number(product.costBase ?? product.cost ?? 0) || 0;
        const nextPurchaseVat = field === 'purchaseVat' ? sanitized : Number(product.purchaseVat ?? 0) || 0;
        const payload = {
          costBase: nextCostBase,
          purchaseVat: nextPurchaseVat,
          cost: nextCostBase + nextPurchaseVat,
        };
        await updateDoc(doc(db, 'products', product.id), payload);
        setProducts(prev => prev.map(p => p.id === product.id ? { ...p, ...payload } : p));
        return;
      }

      await updateDoc(doc(db, 'products', product.id), { [field]: sanitized });
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, [field]: sanitized } : p));
    } catch (e) {
      alert('Error al actualizar: ' + e.message);
    } finally {
      setSavingId(null);
    }
  };

  const handleInputChange = (e) => {
    const { id, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : ['price', 'costBase', 'purchaseVat', 'stockQuantity', 'discount'].includes(id) ? parseFloat(value) || 0 : value,
    }));
  };

  const handleGenderToggle = (g) => {
    setFormData(prev => {
      const genders = prev.genders.includes(g) ? prev.genders.filter(x => x !== g) : [...prev.genders, g];
      return { ...prev, genders, sizeType: genders.length ? prev.sizeType : '', sizeStock: {} };
    });
  };

  const handleSizeStockChange = (gender, size, value) => {
    const key = activeGenders.length > 1 ? getSizeStockKey(gender, size) : size;
    setFormData(prev => ({ ...prev, sizeStock: { ...prev.sizeStock, [key]: parseInt(value) || 0 } }));
  };

  const getSizeStockValue = (gender, size) => {
    const key = activeGenders.length > 1 ? getSizeStockKey(gender, size) : size;
    return formData.sizeStock?.[key] ?? 0;
  };

  const handleAddImage = () => {
    if (!newImageUrl.trim()) return;
    setFormData(prev => ({ ...prev, images: [...(prev.images || []), newImageUrl.trim()] }));
    setNewImageUrl('');
  };

  const handleRemoveImage = (idx) => {
    setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }));
  };

  const handleApplyMassDiscount = async () => {
    if (massDiscount.percentage < 0 || massDiscount.percentage > 100) return alert('Porcentaje inválido');
    if (!confirm(`¿Aplicar ${massDiscount.percentage}% a ${massDiscount.category === 'all' ? 'TODOS los productos' : massDiscount.category}?`)) return;
    setIsLoading(true);
    try {
      const q = massDiscount.category === 'all'
        ? collection(db, 'products')
        : query(collection(db, 'products'), where('category', '==', massDiscount.category));
      const snap = await getDocs(q);
      await Promise.all(snap.docs.map(d => updateDoc(doc(db, 'products', d.id), { discount: massDiscount.percentage })));
      fetchData();
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (product) => {
    setIsLoading(true);
    try {
      const snap = await getDocs(collection(db, 'orders'));
      const hasSales = snap.docs.some(d => (d.data().items || []).some(i => i.id === product.id));
      if (hasSales) {
        if (confirm(`"${product.name}" tiene ventas. ¿Inactivarlo?`)) {
          await updateDoc(doc(db, 'products', product.id), { isActive: false });
          fetchData();
        }
      } else if (confirm(`¿Eliminar definitivamente "${product.name}"?`)) {
        await deleteDoc(doc(db, 'products', product.id));
        fetchData();
      }
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (product) => {
    await updateDoc(doc(db, 'products', product.id), { isActive: !product.isActive });
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, isActive: !p.isActive } : p));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const sanitized = {
        name: formData.name || '',
        description: formData.description || '',
        price: Number(formData.price) || 0,
        costBase: Number(formData.costBase) || 0,
        purchaseVat: Number(formData.purchaseVat) || 0,
        cost: (Number(formData.costBase) || 0) + (Number(formData.purchaseVat) || 0),
        stockQuantity: Number(formData.stockQuantity) || 0,
        category: formData.category || '',
        imageUrl: formData.imageUrl || '',
        images: formData.images || [],
        discount: Number(formData.discount) || 0,
        isPromo: Boolean(formData.isPromo),
        isActive: formData.isActive !== false,
        handlesSizes: Boolean(formData.handlesSizes),
        genders: formData.genders || [],
        sizeType: formData.sizeType || '',
        sizeStock: formData.sizeStock || {},
      };
      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), sanitized);
      } else {
        await addDoc(collection(db, 'products'), { ...sanitized, createdAt: new Date().toISOString() });
      }
      setFormData(EMPTY_FORM);
      setEditingProduct(null);
      fetchData();
      alert('¡Producto guardado correctamente!');
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      description: product.description || '',
      price: product.price || 0,
      costBase: product.costBase ?? product.cost ?? 0,
      purchaseVat: product.purchaseVat ?? 0,
      stockQuantity: product.stockQuantity || 0,
      category: product.category || '',
      imageUrl: product.imageUrl || '',
      images: product.images || [],
      discount: product.discount || 0,
      isPromo: product.isPromo || false,
      isActive: product.isActive !== false,
      handlesSizes: product.handlesSizes || false,
      genders: product.genders || [],
      sizeType: product.sizeType || '',
      sizeStock: product.sizeStock || {},
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // A4 — bulk actions
  const allVisibleIds = visibleProducts.map(p => p.id);
  const allSelected = allVisibleIds.length > 0 && allVisibleIds.every(id => selectedIds.has(id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allVisibleIds));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBulkAction = async (action) => {
    if (selectedIds.size === 0) return;
    const ids = [...selectedIds];
    const label = action === 'delete' ? 'ELIMINAR' : action === 'activate' ? 'activar' : 'inactivar';
    if (!confirm(`¿${label} los ${ids.length} productos seleccionados?`)) return;
    setBulkLoading(true);
    try {
      if (action === 'delete') {
        await Promise.all(ids.map(id => deleteDoc(doc(db, 'products', id))));
      } else {
        const val = action === 'activate';
        await Promise.all(ids.map(id => updateDoc(doc(db, 'products', id), { isActive: val })));
      }
      setSelectedIds(new Set());
      fetchData();
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Descuento masivo */}
      <div className="bg-gradient-to-r from-brand-gold/10 to-transparent p-6 rounded-3xl border border-brand-gold/20 flex flex-wrap items-center gap-6">
        <div>
          <h3 className="font-black text-brand-dark uppercase tracking-tighter">Descuento Masivo</h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase">Aplica promociones a todo el inventario</p>
        </div>
        <div className="flex gap-2 items-center bg-white p-2 rounded-2xl shadow-sm flex-wrap">
          <select value={massDiscount.category} onChange={(e) => setMassDiscount(p => ({ ...p, category: e.target.value }))}
            className="text-xs font-bold px-3 py-2 bg-gray-50 rounded-xl outline-none border-none">
            <option value="all">Todo el Inventario</option>
            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          <div className="flex items-center gap-1 bg-gray-50 px-3 py-2 rounded-xl">
            <input type="number" value={massDiscount.percentage}
              onChange={(e) => setMassDiscount(p => ({ ...p, percentage: parseFloat(e.target.value) }))}
              className="w-10 bg-transparent text-center font-black text-brand-gold outline-none" />
            <span className="text-xs font-black text-brand-gold">%</span>
          </div>
          <button onClick={handleApplyMassDiscount} className="bg-brand-dark text-white px-4 py-2 rounded-xl text-xs font-black uppercase hover:bg-brand-gold transition-all">Aplicar</button>
        </div>
      </div>

      {/* Formulario */}
      <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
        <h2 className="text-xl font-bold text-brand-dark mb-6">{editingProduct ? 'Editar Producto' : 'Crear Nuevo Producto'}</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input id="name" label="Nombre" value={formData.name} onChange={handleInputChange} required />
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase ml-1">Categoría</label>
            <select id="category" value={formData.category} onChange={handleInputChange}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-brand-gold transition-all">
              <option value="">Sin Categoría</option>
              {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <Input id="description" label="Descripción" value={formData.description} onChange={handleInputChange} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input id="price" label="Precio de Venta" type="number" value={formData.price} onChange={handleInputChange} required />
            <Input id="discount" label="% Descuento" type="number" value={formData.discount} onChange={handleInputChange} />
          </div>
          <div className="grid grid-cols-3 gap-4 md:col-span-2">
            <Input id="costBase" label="Costo Base" type="number" value={formData.costBase} onChange={handleInputChange} required />
            <Input id="purchaseVat" label="IVA Compra" type="number" value={formData.purchaseVat} onChange={handleInputChange} />
            <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 flex flex-col justify-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Costo Total</p>
              <p className="text-sm font-black text-brand-dark">
                ${((Number(formData.costBase) || 0) + (Number(formData.purchaseVat) || 0)).toLocaleString('es-CO')}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input id="stockQuantity" label="Stock Inicial" type="number" value={formData.stockQuantity} onChange={handleInputChange} required />
          </div>

          {/* Imágenes */}
          <div className="md:col-span-2 space-y-3">
            <Input id="imageUrl" label="URL Imagen Principal" placeholder="https://..." value={formData.imageUrl} onChange={handleInputChange} />
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase ml-1">Imágenes Adicionales</label>
              <div className="flex gap-2">
                <input type="url" value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)}
                  placeholder="https://... URL imagen adicional"
                  className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-gold transition-all" />
                <button type="button" onClick={handleAddImage}
                  className="px-4 py-2 bg-brand-dark text-white rounded-xl text-xs font-black uppercase hover:bg-brand-gold transition-all">
                  + Agregar
                </button>
              </div>
              {(formData.images || []).length > 0 && (
                <div className="flex gap-2 flex-wrap mt-2">
                  {formData.images.map((url, i) => (
                    <div key={i} className="relative group">
                      <img src={url} alt="" className="w-16 h-16 object-cover rounded-xl border border-gray-100" />
                      <button type="button" onClick={() => handleRemoveImage(i)}
                        className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input type="checkbox" id="isPromo" checked={formData.isPromo} onChange={handleInputChange} className="w-5 h-5 accent-brand-gold" />
            <label htmlFor="isPromo" className="text-sm font-bold text-brand-dark cursor-pointer">Marcar como PROMOCIÓN (Aparece primero)</label>
          </div>

          {/* B6 — Tallas */}
          <div className="md:col-span-2 space-y-4 border border-dashed border-gray-200 rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <input type="checkbox" id="handlesSizes" checked={formData.handlesSizes} onChange={handleInputChange} className="w-5 h-5 accent-brand-gold" />
              <label htmlFor="handlesSizes" className="text-sm font-bold text-brand-dark cursor-pointer">Este producto maneja tallas</label>
            </div>

            {formData.handlesSizes && (
              <div className="space-y-4 pt-2">
                {/* Gender checkboxes */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aplica para</label>
                  <div className="flex gap-3 flex-wrap">
                    {GENDERS.map(g => (
                      <label key={g} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={activeGenders.includes(g)} onChange={() => handleGenderToggle(g)} className="w-4 h-4 accent-brand-gold" />
                        <span className="text-sm font-bold text-brand-dark">{g}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Size type selector */}
                {activeGenders.length > 0 && availableSizeTypes.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tipo de Talla</label>
                    <div className="flex gap-2 flex-wrap">
                      {availableSizeTypes.map(type => (
                        <button key={type} type="button"
                          onClick={() => setFormData(prev => ({ ...prev, sizeType: type, sizeStock: {} }))}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${formData.sizeType === type ? 'bg-brand-dark text-white' : 'bg-gray-100 text-slate-600 hover:bg-gray-200'}`}>
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stock per size */}
                {formData.sizeType && activeGenders.length > 0 && (
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stock por Talla</label>
                    {activeGenders.map(gender => {
                      const genderSizes = getSizesForGenderType(gender, formData.sizeType);
                      if (genderSizes.length === 0) return null;
                      return (
                        <div key={gender} className="space-y-2">
                          {activeGenders.length > 1 && (
                            <p className="text-xs font-bold text-slate-500 uppercase">{gender}</p>
                          )}
                          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
                            {genderSizes.map(size => (
                              <div key={size} className="flex flex-col items-center gap-1">
                                <span className="text-[10px] font-bold text-slate-400">{size}</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={getSizeStockValue(gender, size)}
                                  onChange={e => handleSizeStockChange(gender, size, e.target.value)}
                                  className="w-full text-center text-xs bg-gray-50 border border-gray-100 rounded-lg py-1.5 font-bold outline-none focus:border-brand-gold"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="md:col-span-2 flex justify-end gap-3 pt-4">
            {editingProduct && (
              <Button variant="secondary" type="button" onClick={() => { setEditingProduct(null); setFormData(EMPTY_FORM); }}>
                Cancelar
              </Button>
            )}
            <Button type="submit">{editingProduct ? 'Actualizar Producto' : 'Crear Producto'}</Button>
          </div>
        </form>
      </div>

      {/* Search & filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full bg-white border border-gray-100 rounded-2xl pl-10 pr-4 py-3 text-sm outline-none focus:border-brand-gold shadow-sm transition-all"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          className="bg-white border border-gray-100 rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:border-brand-gold shadow-sm">
          <option value="all">Todas las categorías</option>
          {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        <span className="text-xs text-slate-400 font-medium">{visibleProducts.length} productos</span>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-brand-dark text-white px-6 py-4 rounded-2xl shadow-lg flex-wrap">
          <span className="text-sm font-bold">{selectedIds.size} seleccionados</span>
          <div className="flex gap-2 ml-auto flex-wrap">
            <button onClick={() => handleBulkAction('activate')} disabled={bulkLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-black uppercase hover:bg-green-700 transition-all disabled:opacity-50">
              Activar
            </button>
            <button onClick={() => handleBulkAction('deactivate')} disabled={bulkLoading}
              className="px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-black uppercase hover:bg-amber-600 transition-all disabled:opacity-50">
              Inactivar
            </button>
            <button onClick={() => handleBulkAction('delete')} disabled={bulkLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-black uppercase hover:bg-red-700 transition-all disabled:opacity-50">
              Eliminar
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="px-3 py-2 bg-white/20 rounded-xl text-xs font-bold hover:bg-white/30 transition-all">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Products table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 text-[10px] uppercase tracking-widest font-bold text-slate-400">
            <tr>
              <th className="px-4 py-4">
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="w-4 h-4 accent-brand-gold cursor-pointer" />
              </th>
              <th className="px-6 py-4">Producto</th>
              <th className="px-6 py-4">Categoría</th>
              <th className="px-6 py-4">Stock</th>
              <th className="px-6 py-4">Venta</th>
              <th className="px-6 py-4">Costo Base</th>
              <th className="px-6 py-4">IVA Compra</th>
              <th className="px-6 py-4">Costo Total</th>
              <th className="px-6 py-4">% Desc</th>
              <th className="px-6 py-4">Promo</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {visibleProducts.map(p => (
              <tr key={p.id} className={`hover:bg-gray-50/50 transition-colors ${!p.isActive ? 'opacity-60 grayscale' : ''} ${selectedIds.has(p.id) ? 'bg-brand-gold/5' : ''}`}>
                <td className="px-4 py-4">
                  <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)} className="w-4 h-4 accent-brand-gold cursor-pointer" />
                </td>
                <td className="px-6 py-4 flex items-center gap-3">
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                    <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                    {(p.images?.length > 0) && (
                      <span className="absolute bottom-0 right-0 bg-black/60 text-white text-[8px] px-1 rounded-tl-lg">+{p.images.length}</span>
                    )}
                  </div>
                  <div>
                    <span className="font-bold text-brand-dark block text-xs truncate max-w-[120px]">{p.name}</span>
                    {p.handlesSizes && (
                      <span className="text-[9px] text-brand-gold font-bold">{(p.genders || []).join(', ')} · {p.sizeType}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2">
                  <select value={p.category || ''} onChange={e => handleQuickUpdate(p, 'category', e.target.value)}
                    className="text-xs bg-gray-50 border-none rounded-lg p-1 outline-none focus:ring-1 focus:ring-brand-gold w-full">
                    <option value="">Sin Cat.</option>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <input type="number" value={p.stockQuantity}
                    onChange={e => handleQuickUpdate(p, 'stockQuantity', Number(e.target.value))}
                    className="w-16 text-xs bg-gray-50 border-none rounded-lg p-1 font-bold text-center" />
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-1 bg-gray-50 rounded-lg px-2 py-1">
                    <span className="text-[10px] text-slate-400">$</span>
                    <input type="number" value={p.price}
                      onChange={e => handleQuickUpdate(p, 'price', Number(e.target.value))}
                      className="w-20 text-xs bg-transparent border-none font-bold outline-none" />
                  </div>
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-1 bg-gray-50 rounded-lg px-2 py-1 border border-dashed border-gray-200">
                    <span className="text-[10px] text-slate-400">$</span>
                    <input type="number" value={p.costBase ?? p.cost ?? 0}
                      onChange={e => handleQuickUpdate(p, 'costBase', Number(e.target.value))}
                      className="w-20 text-xs bg-transparent border-none font-medium outline-none text-slate-500" />
                  </div>
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-1 bg-gray-50 rounded-lg px-2 py-1 border border-dashed border-gray-200">
                    <span className="text-[10px] text-slate-400">$</span>
                    <input type="number" value={p.purchaseVat ?? 0}
                      onChange={e => handleQuickUpdate(p, 'purchaseVat', Number(e.target.value))}
                      className="w-20 text-xs bg-transparent border-none font-medium outline-none text-slate-500" />
                  </div>
                </td>
                <td className="px-4 py-2 text-xs font-black text-slate-700">
                  ${((Number(p.costBase ?? p.cost ?? 0) || 0) + (Number(p.purchaseVat ?? 0) || 0)).toLocaleString('es-CO')}
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-1">
                    <input type="number" value={p.discount || 0}
                      onChange={e => handleQuickUpdate(p, 'discount', Number(e.target.value))}
                      className="w-12 text-xs bg-brand-gold/5 text-brand-gold border-none rounded-lg p-1 font-black text-center" />
                    <span className="text-[10px] text-brand-gold">%</span>
                  </div>
                </td>
                <td className="px-4 py-2 text-center">
                  <input type="checkbox" checked={p.isPromo} onChange={e => handleQuickUpdate(p, 'isPromo', e.target.checked)}
                    className="w-4 h-4 accent-brand-gold cursor-pointer" />
                </td>
                <td className="px-4 py-2">
                  <button onClick={() => handleToggleActive(p)}
                    className={`px-2 py-1 rounded-full text-[9px] font-black uppercase transition-all ${p.isActive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {p.isActive ? 'Activo' : 'Inactivo'}
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  {savingId === p.id ? (
                    <div className="animate-spin h-4 w-4 border-2 border-brand-gold border-t-transparent rounded-full ml-auto" />
                  ) : (
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleEdit(p)} className="p-2 hover:bg-brand-gold/10 rounded-full transition-colors" title="Editar">
                        <svg className="w-4 h-4 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      <button onClick={() => handleDelete(p)} className="p-2 hover:bg-red-50 rounded-full transition-colors" title="Eliminar">
                        <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {visibleProducts.length === 0 && (
              <tr>
                <td colSpan={12} className="text-center py-16 text-slate-400 text-sm">
                  {search ? `No hay productos que coincidan con "${search}"` : 'Sin productos'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductsTab;
