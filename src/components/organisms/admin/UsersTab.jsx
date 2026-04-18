import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../../firebase/firebase.config';

const UsersTab = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const usersData = [];
        querySnapshot.forEach((doc) => {
          usersData.push({ id: doc.id, ...doc.data() });
        });
        setUsers(usersData);
      } catch (error) {
        console.error("Error al cargar usuarios:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleChangeRole = async (userId, newRole) => {
    setUpdatingId(userId);
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { role: newRole });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (error) {
      console.error("Error al cambiar rol:", error);
      alert("No se pudo actualizar el rol.");
    } finally {
      setUpdatingId(null);
    }
  };

  if (isLoading) return <div className="py-20 text-center text-slate-400">Cargando base de datos de clientes...</div>;

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in">
      <div className="p-6 border-b border-gray-50 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-brand-dark">Gestión de Usuarios</h2>
          <p className="text-xs text-slate-400">Total registrados: {users.length}</p>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 text-slate-400 text-[10px] uppercase tracking-widest font-bold">
              <th className="px-6 py-4">Usuario / Cliente</th>
              <th className="px-6 py-4">Ubicación</th>
              <th className="px-6 py-4">Contacto</th>
              <th className="px-6 py-4">Rol Actual</th>
              <th className="px-6 py-4">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-xs font-bold text-slate-500">
                      {user.firstName ? user.firstName[0] : '?'}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-brand-dark">{user.firstName} {user.lastName}</div>
                      <div className="text-[10px] text-slate-400">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-xs text-brand-dark font-medium">{user.city || 'No especificada'}</div>
                  <div className="text-[10px] text-slate-400">{user.department}</div>
                </td>
                <td className="px-6 py-4 text-xs text-slate-500">{user.phone}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                    user.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {user.role || 'cliente'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <select
                    disabled={updatingId === user.id}
                    value={user.role || 'cliente'}
                    onChange={(e) => handleChangeRole(user.id, e.target.value)}
                    className="text-[10px] font-bold bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 outline-none focus:border-brand-gold"
                  >
                    <option value="cliente">Cliente</option>
                    <option value="admin">Administrador (Delegado)</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UsersTab;
