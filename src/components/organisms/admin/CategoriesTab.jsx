import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc, query, where, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '../../../firebase/firebase.config';
import Button from '../../atoms/Button';
import Input from '../../atoms/Input';

const CategoriesTab = () => {
  const [categories, setCategories] = useState([]);
  const [newCat, setNewCat] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchCategories = async () => {
    setIsLoading(true);
    const snap = await getDocs(query(collection(db, 'categories'), orderBy('order', 'asc')));
    const cats = [];
    snap.forEach(doc => cats.push({ id: doc.id, ...doc.data() }));
    setCategories(cats);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAdd = async () => {
    if (!newCat) return;
    const id = newCat.trim();
    await setDoc(doc(db, 'categories', id), {
      name: id,
      isActive: true,
      order: categories.length + 1,
      createdAt: new Date().toISOString()
    });
    setNewCat('');
    fetchCategories();
  };

  const handleUpdateOrder = async (catId, newOrder) => {
    await updateDoc(doc(db, 'categories', catId), { order: parseInt(newOrder) });
    fetchCategories();
  };

  const handleDelete = async (catId) => {
    const productsQuery = query(collection(db, 'products'), where('category', '==', catId));
    const productsSnap = await getDocs(productsQuery);
    
    if (!productsSnap.empty) {
      if (confirm(`La categoría "${catId}" tiene productos asociados. ¿Deseas inactivarla en lugar de borrarla?`)) {
        await updateDoc(doc(db, 'categories', catId), { isActive: false });
        fetchCategories();
      }
      return;
    }

    if (confirm(`¿Estás seguro de borrar la categoría "${catId}"?`)) {
      await deleteDoc(doc(db, 'categories', catId));
      fetchCategories();
    }
  };

  const handleToggle = async (catId, currentStatus) => {
    await updateDoc(doc(db, 'categories', catId), { isActive: !currentStatus });
    fetchCategories();
  };

  return (
    <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm animate-fade-in">
      <h2 className="text-xl font-bold text-brand-dark mb-6">Gestión de Categorías</h2>

      <div className="flex gap-2 mb-8">
        <Input 
          placeholder="Nombre de la nueva categoría (ej: Batas)"
          value={newCat}
          onChange={(e) => setNewCat(e.target.value)}
        />
        <Button onClick={handleAdd} className="whitespace-nowrap">Agregar</Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-50">
        <table className="w-full text-left">
          <thead className="bg-gray-50">
            <tr className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
              <th className="px-6 py-4">Prioridad</th>
              <th className="px-6 py-4">Nombre</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {categories.map(cat => (
              <tr key={cat.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4">
                  <input 
                    type="number" 
                    value={cat.order || 0}
                    onChange={(e) => handleUpdateOrder(cat.id, e.target.value)}
                    className="w-12 bg-gray-50 border border-gray-100 rounded px-2 py-1 text-xs font-bold text-brand-dark focus:border-brand-gold outline-none"
                  />
                </td>
                <td className="px-6 py-4 font-bold text-brand-dark">{cat.name}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${cat.isActive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {cat.isActive ? 'Activa' : 'Inactiva'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button 
                    onClick={() => handleToggle(cat.id, cat.isActive)}
                    className="text-xs text-brand-gold font-bold hover:underline"
                  >
                    {cat.isActive ? 'Inactivar' : 'Activar'}
                  </button>
                  <button 
                    onClick={() => handleDelete(cat.id)}
                    className="text-xs text-red-500 font-bold hover:underline"
                  >
                    Borrar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CategoriesTab;
