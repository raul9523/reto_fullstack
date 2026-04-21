import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../../firebase/firebase.config';
import Button from '../../atoms/Button';
import Input from '../../atoms/Input';

const COLOMBIA_DEPARTMENTS = [
  'Antioquia','Atlántico','Bogotá D.C.','Bolívar','Boyacá','Caldas','Caquetá',
  'Cauca','Cesar','Córdoba','Cundinamarca','Chocó','Huila','La Guajira','Magdalena',
  'Meta','Nariño','Norte de Santander','Putumayo','Quindío','Risaralda','Santander',
  'Sucre','Tolima','Valle del Cauca','Arauca','Casanare','Amazonas','Guainía',
  'Guaviare','San Andrés','Vaupés','Vichada',
];

const EMPTY_EDIT = {
  firstName: '', lastName: '', phone: '',
  documentType: 'CC', documentNumber: '', dv: '',
  department: '', city: '', address: '', role: 'cliente',
};

const UsersTab = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [deletingIds, setDeletingIds] = useState(new Set());
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Filtro de búsqueda ────────────────────────────────────────────────────
  const filtered = users.filter(u => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.email?.toLowerCase().includes(q) ||
      u.firstName?.toLowerCase().includes(q) ||
      u.lastName?.toLowerCase().includes(q) ||
      u.phone?.includes(q)
    );
  });

  // ── Selección ─────────────────────────────────────────────────────────────
  const allSelected = filtered.length > 0 && filtered.every(u => selectedIds.has(u.id));

  const toggleAll = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) filtered.forEach(u => next.delete(u.id));
      else filtered.forEach(u => next.add(u.id));
      return next;
    });
  };

  const toggleOne = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Eliminación ───────────────────────────────────────────────────────────
  const handleDelete = async (ids) => {
    const count = ids.length;
    const msg = count === 1
      ? '¿Eliminar este usuario? Se borrará su cuenta y datos. Sus pedidos quedan en el historial.'
      : `¿Eliminar ${count} usuarios? Se borrarán sus cuentas y datos. Los pedidos quedan en el historial.`;
    if (!confirm(msg)) return;

    setDeletingIds(new Set(ids));
    try {
      const fn = httpsCallable(functions, 'deleteUsers');
      await fn({ userIds: ids });
      setUsers(prev => prev.filter(u => !ids.includes(u.id)));
      setSelectedIds(prev => {
        const next = new Set(prev);
        ids.forEach(id => next.delete(id));
        return next;
      });
    } catch (err) {
      alert('Error al eliminar: ' + (err.message ?? err));
    } finally {
      setDeletingIds(new Set());
    }
  };

  // ── Edición ───────────────────────────────────────────────────────────────
  const openEdit = (user) => {
    setEditingUser(user);
    setEditForm({
      firstName:      user.firstName      ?? '',
      lastName:       user.lastName       ?? '',
      phone:          user.phone          ?? '',
      documentType:   user.documentType   ?? 'CC',
      documentNumber: user.documentNumber ?? '',
      dv:             user.dv             ?? '',
      department:     user.department     ?? '',
      city:           user.city           ?? '',
      address:        user.address        ?? '',
      role:           user.role           ?? 'cliente',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setIsSavingEdit(true);
    try {
      await updateDoc(doc(db, 'users', editingUser.id), editForm);
      setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...editForm } : u));
      setEditingUser(null);
    } catch (err) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const ef = (field) => (e) => setEditForm(p => ({ ...p, [field]: e.target.value }));

  if (isLoading) return (
    <div className="py-20 text-center text-slate-400">Cargando base de datos de clientes...</div>
  );

  return (
    <>
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div>
            <h2 className="text-xl font-bold text-brand-dark">Gestión de Usuarios</h2>
            <p className="text-xs text-slate-400">
              {users.length} registrados
              {selectedIds.size > 0 && ` · ${selectedIds.size} seleccionado${selectedIds.size > 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Buscar por nombre, email o teléfono…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-4 py-2 outline-none focus:border-brand-gold w-64 transition-colors"
            />
            {selectedIds.size > 0 && (
              <button
                onClick={() => handleDelete([...selectedIds])}
                disabled={deletingIds.size > 0}
                className="text-xs font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 px-4 py-2 rounded-xl transition-colors"
              >
                {deletingIds.size > 0 ? 'Eliminando…' : `Eliminar (${selectedIds.size})`}
              </button>
            )}
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-slate-400 text-[10px] uppercase tracking-widest font-bold">
                <th className="px-4 py-4 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded text-brand-gold focus:ring-brand-gold"
                  />
                </th>
                <th className="px-4 py-4">Usuario</th>
                <th className="px-4 py-4">Ubicación</th>
                <th className="px-4 py-4">Contacto</th>
                <th className="px-4 py-4">Rol</th>
                <th className="px-4 py-4">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-400 italic">
                    {search ? 'No se encontraron resultados.' : 'No hay usuarios registrados.'}
                  </td>
                </tr>
              ) : filtered.map((user) => {
                const isDeleting = deletingIds.has(user.id);
                return (
                  <tr
                    key={user.id}
                    className={`transition-colors ${isDeleting ? 'opacity-40' : 'hover:bg-gray-50/50'} ${selectedIds.has(user.id) ? 'bg-brand-gold/5' : ''}`}
                  >
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(user.id)}
                        onChange={() => toggleOne(user.id)}
                        disabled={isDeleting}
                        className="w-4 h-4 rounded text-brand-gold focus:ring-brand-gold"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-xs font-bold text-slate-500 flex-shrink-0">
                          {user.firstName ? user.firstName[0].toUpperCase() : '?'}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-brand-dark">
                            {user.firstName || user.lastName ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : '—'}
                          </div>
                          <div className="text-[10px] text-slate-400">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-xs text-brand-dark font-medium">{user.city || '—'}</div>
                      <div className="text-[10px] text-slate-400">{user.department || ''}</div>
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-500">{user.phone || '—'}</td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {user.role || 'cliente'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(user)}
                          disabled={isDeleting}
                          className="text-[10px] font-bold text-brand-gold hover:text-brand-dark transition-colors px-2 py-1 rounded-lg hover:bg-gray-100 disabled:opacity-40"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete([user.id])}
                          disabled={isDeleting}
                          className="text-[10px] font-bold text-red-400 hover:text-red-600 transition-colors px-2 py-1 rounded-lg hover:bg-red-50 disabled:opacity-40"
                        >
                          {isDeleting ? '…' : 'Eliminar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de edición */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-3xl">
              <div>
                <h3 className="text-lg font-bold text-brand-dark">Editar Usuario</h3>
                <p className="text-xs text-slate-400">{editingUser.email}</p>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-brand-dark transition-colors text-xl font-light w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Nombre */}
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Información Personal</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Nombre" value={editForm.firstName} onChange={ef('firstName')} />
                  <Input label="Apellido" value={editForm.lastName} onChange={ef('lastName')} />
                </div>
              </div>

              {/* Documento */}
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Documento de Identidad</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-500">Tipo</label>
                    <select
                      value={editForm.documentType}
                      onChange={ef('documentType')}
                      className="text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-brand-gold transition-colors"
                    >
                      {['CC','CE','NIT','TI','PP','PEP'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <Input label="Número" value={editForm.documentNumber} onChange={ef('documentNumber')} />
                  {editForm.documentType === 'NIT' && (
                    <Input label="DV" value={editForm.dv} onChange={ef('dv')} />
                  )}
                </div>
              </div>

              {/* Contacto */}
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Contacto y Dirección</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Teléfono" value={editForm.phone} onChange={ef('phone')} />
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-500">Departamento</label>
                    <select
                      value={editForm.department}
                      onChange={ef('department')}
                      className="text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-brand-gold transition-colors"
                    >
                      <option value="">— Seleccionar —</option>
                      {COLOMBIA_DEPARTMENTS.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <Input label="Ciudad" value={editForm.city} onChange={ef('city')} />
                  <Input label="Dirección" value={editForm.address} onChange={ef('address')} />
                </div>
              </div>

              {/* Rol */}
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Rol en el Sistema</p>
                <div className="flex gap-3">
                  {['cliente', 'admin'].map(r => (
                    <label key={r} className={`flex-1 flex items-center justify-center gap-2 p-3 border-2 rounded-xl cursor-pointer transition-colors ${
                      editForm.role === r ? 'border-brand-gold bg-brand-gold/5' : 'border-gray-100 hover:border-gray-200'
                    }`}>
                      <input
                        type="radio"
                        name="role"
                        value={r}
                        checked={editForm.role === r}
                        onChange={ef('role')}
                        className="hidden"
                      />
                      <span className="text-sm font-bold text-brand-dark capitalize">{r}</span>
                    </label>
                  ))}
                </div>
                {editForm.role === 'admin' && (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl p-3 mt-3">
                    Este usuario tendrá acceso completo al panel de administración.
                  </p>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-50 flex justify-end gap-3 sticky bottom-0 bg-white rounded-b-3xl">
              <button
                onClick={() => setEditingUser(null)}
                className="text-sm font-bold text-slate-400 hover:text-brand-dark px-5 py-2.5 rounded-xl hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <Button onClick={handleSaveEdit} disabled={isSavingEdit}>
                {isSavingEdit ? 'Guardando…' : 'Guardar cambios'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UsersTab;
