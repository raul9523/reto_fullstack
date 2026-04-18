import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebase.config.js';
import { useUserStore } from '../store/userStore';
import Input from '../components/atoms/Input';
import Button from '../components/atoms/Button';

// Algoritmo estándar para calcular el Dígito de Verificación (DV) en Colombia
const calculateDV = (nit) => {
  // Limpiamos el string por si tiene puntos o guiones
  const cleanNit = nit.replace(/\D/g, '');
  if (!cleanNit || isNaN(cleanNit)) return "";
  
  const vpri = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
  let x = 0;
  let y = 0;
  let z = cleanNit.length;
  
  for (let i = 0; i < z; i++) {
    y = parseInt(cleanNit.charAt(i), 10);
    x += y * vpri[z - 1 - i];
  }
  
  y = x % 11;
  return y > 1 ? (11 - y).toString() : y.toString();
};

const Registro = () => {
  const [docTypes, setDocTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  
  const { registerUser, isLoading: isRegistering } = useUserStore();

  // Estado del formulario
  const [formData, setFormData] = useState({
    documentType: '',
    documentNumber: '',
    dv: '',
    firstName: '',
    lastName: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    addressParts: {
      viaType: 'Calle',
      numeroPrincipal: '',
      numeroSecundario: '',
      numeroPlaca: '',
      complemento: ''
    },
    birthDate: '',
    password: ''
  });

  // Fetch document types from Firestore
  useEffect(() => {
    const fetchDocTypes = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "document_types"));
        const types = [];
        querySnapshot.forEach((doc) => {
          types.push({ id: doc.id, ...doc.data() });
        });
        setDocTypes(types);
        
        // Seleccionar el primero por defecto si existe
        if (types.length > 0) {
          setFormData(prev => ({ ...prev, documentType: types[0].id }));
        }
      } catch (error) {
        console.error("Error fetching document types:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocTypes();
  }, []);

  // Manejar cambios en los inputs genéricos
  const handleChange = (e) => {
    const { id, value } = e.target;
    
    setFormData(prev => {
      const newData = { ...prev, [id]: value };
      
      // Si el campo que cambió fue el número de documento y el tipo es NIT, calcular DV
      if (id === 'documentNumber' && isCompany(newData.documentType)) {
        newData.dv = calculateDV(value);
      }
      
      return newData;
    });
  };

  // Manejar cambio en el tipo de documento (select)
  const handleDocTypeChange = (e) => {
    const newType = e.target.value;
    setFormData(prev => {
      const newData = { ...prev, documentType: newType };
      
      // Si cambia a NIT, calcular DV inmediatamente con el número actual
      if (isCompany(newType)) {
        newData.dv = calculateDV(prev.documentNumber);
        newData.birthDate = ''; // Limpiar fecha de nacimiento si es empresa
      } else {
        newData.dv = ''; // Limpiar DV si no es empresa
      }
      
      return newData;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError(null);
    
    // Extraemos contraseña y correo para Auth, el resto va a Firestore
    const { email, password, ...extraData } = formData;
    
    if (password.length < 6) {
      setAuthError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    try {
      await registerUser(email, password, extraData);
      alert("¡Registro exitoso! Sesión iniciada.");
      window.location.href = '/';
    } catch (error) {
      console.error("Error al registrar:", error);
      // Traducción de errores comunes de Firebase
      if (error.code === 'auth/email-already-in-use') {
        setAuthError("Este correo electrónico ya está registrado. Por favor, intenta iniciar sesión.");
      } else if (error.code === 'auth/weak-password') {
        setAuthError("La contraseña es muy débil. Debe tener al menos 6 caracteres.");
      } else if (error.code === 'auth/invalid-email') {
        setAuthError("El correo electrónico no es válido.");
      } else {
        setAuthError("Hubo un error al registrar: " + error.message);
      }
    }
  };

  // Helper para saber si el tipo de documento seleccionado pertenece a una empresa
  const isCompany = (typeId) => {
    const type = docTypes.find(t => t.id === typeId);
    return type ? type.isCompany : false;
  };

  const currentTypeIsCompany = isCompany(formData.documentType);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col justify-center items-center py-12 px-4 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-[-5%] left-[-5%] w-[30%] h-[30%] bg-brand-gold/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] bg-brand-gold/5 rounded-full blur-3xl"></div>

      <div className="w-full max-w-2xl animate-fade-in relative z-10">
        <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden border border-brand-gold/10">
          <div className="bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] p-10 text-center border-b border-brand-gold/20">
            <h1 className="text-3xl font-black text-brand-gold tracking-tighter uppercase mb-1">Únete a DÚO DREAMS</h1>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em]">Crea tu cuenta premium</p>
          </div>

          <form className="p-10 space-y-8" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              
              {/* Document Type */}
              <div className="sm:col-span-2 space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tipo de Documento</label>
                <select
                  id="documentType"
                  value={formData.documentType}
                  onChange={handleDocTypeChange}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-medium outline-none focus:border-brand-gold transition-all"
                  required
                >
                  {docTypes.map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </div>

              {/* Document Number */}
              <div className={currentTypeIsCompany ? "sm:col-span-1" : "sm:col-span-2"}>
                <Input
                  id="documentNumber"
                  label="Número de Documento"
                  placeholder="Ej. 123456789"
                  value={formData.documentNumber}
                  onChange={handleChange}
                  required
                />
              </div>
              
              {currentTypeIsCompany && (
                <div className="sm:col-span-1">
                  <Input
                    id="dv"
                    label="Dígito de Verificación"
                    value={formData.dv}
                    readOnly
                    disabled
                    className="bg-gray-50 text-brand-gold font-bold"
                  />
                </div>
              )}

              {/* Name / Business Name */}
              {!currentTypeIsCompany ? (
                <>
                  <Input id="firstName" label="Nombres" value={formData.firstName} onChange={handleChange} required />
                  <Input id="lastName" label="Apellidos" value={formData.lastName} onChange={handleChange} required />
                  <div className="sm:col-span-2">
                    <Input id="birthDate" type="date" label="Fecha de Nacimiento" value={formData.birthDate} onChange={handleChange} required />
                  </div>
                </>
              ) : (
                <>
                  <div className="sm:col-span-2">
                    <Input id="firstName" label="Razón Social" value={formData.firstName} onChange={handleChange} required />
                  </div>
                  <div className="sm:col-span-2">
                    <Input id="contactName" label="Representante Legal" value={formData.contactName} onChange={handleChange} required />
                  </div>
                </>
              )}

              {/* Contact Info */}
              <Input id="email" type="email" label="Correo Electrónico" value={formData.email} onChange={handleChange} required />
              <Input id="phone" type="tel" label="Celular" value={formData.phone} onChange={handleChange} required />

              {/* DIAN Address */}
              <div className="sm:col-span-2 space-y-3 p-6 bg-gray-50 rounded-3xl border border-gray-100">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Dirección (Norma DIAN)</label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    id="viaType"
                    value={formData.addressParts?.viaType || 'Calle'}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        addressParts: { ...prev.addressParts, viaType: val },
                        address: `${val} ${prev.addressParts?.numeroPrincipal || ''} # ${prev.addressParts?.numeroSecundario || ''} - ${prev.addressParts?.numeroPlaca || ''} ${prev.addressParts?.complemento || ''}`.trim()
                      }));
                    }}
                    className="bg-white border border-gray-100 rounded-xl px-4 py-3 text-sm outline-none"
                  >
                    {['Calle', 'Carrera', 'Avenida', 'Diagonal', 'Transversal'].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <input
                    type="text" placeholder="Número" className="bg-white border border-gray-100 rounded-xl px-4 py-3 text-sm outline-none"
                    value={formData.addressParts?.numeroPrincipal || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        addressParts: { ...prev.addressParts, numeroPrincipal: val },
                        address: `${prev.addressParts?.viaType || 'Calle'} ${val} # ${prev.addressParts?.numeroSecundario || ''} - ${prev.addressParts?.numeroPlaca || ''} ${prev.addressParts?.complemento || ''}`.trim()
                      }));
                    }}
                    required
                  />
                  <input
                    type="text" placeholder="# Cruce" className="bg-white border border-gray-100 rounded-xl px-4 py-3 text-sm outline-none"
                    value={formData.addressParts?.numeroSecundario || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        addressParts: { ...prev.addressParts, numeroSecundario: val },
                        address: `${prev.addressParts?.viaType || 'Calle'} ${prev.addressParts?.numeroPrincipal || ''} # ${val} - ${prev.addressParts?.numeroPlaca || ''} ${prev.addressParts?.complemento || ''}`.trim()
                      }));
                    }}
                    required
                  />
                  <input
                    type="text" placeholder="- Placa" className="bg-white border border-gray-100 rounded-xl px-4 py-3 text-sm outline-none"
                    value={formData.addressParts?.numeroPlaca || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        addressParts: { ...prev.addressParts, numeroPlaca: val },
                        address: `${prev.addressParts?.viaType || 'Calle'} ${prev.addressParts?.numeroPrincipal || ''} # ${prev.addressParts?.numeroSecundario || ''} - ${val} ${prev.addressParts?.complemento || ''}`.trim()
                      }));
                    }}
                    required
                  />
                </div>
                <input
                  type="text" placeholder="Complemento (Apto, Interior...)" className="w-full bg-white border border-gray-100 rounded-xl px-4 py-3 text-sm outline-none"
                  value={formData.addressParts?.complemento || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      addressParts: { ...prev.addressParts, complemento: val },
                      address: `${prev.addressParts?.viaType || 'Calle'} ${prev.addressParts?.numeroPrincipal || ''} # ${prev.addressParts?.numeroSecundario || ''} - ${prev.addressParts?.numeroPlaca || ''} ${val}`.trim()
                    }));
                  }}
                />
                <p className="text-[10px] text-brand-gold font-bold italic tracking-wide">Vista previa: {formData.address}</p>
              </div>

              <div className="sm:col-span-2">
                <Input id="password" type="password" label="Contraseña" placeholder="Mínimo 6 caracteres" value={formData.password} onChange={handleChange} required />
              </div>
            </div>

            {authError && (
              <div className="p-4 bg-red-50 text-red-500 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-center border border-red-100">
                {authError}
              </div>
            )}

            <Button type="submit" disabled={isRegistering} className="w-full py-5 rounded-[25px] shadow-xl shadow-brand-gold/10 text-sm font-black uppercase tracking-[0.2em] transition-all hover:scale-[1.01]">
              {isRegistering ? 'Creando cuenta...' : 'Crear Cuenta Premium'}
            </Button>

            <div className="text-center">
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                ¿Ya tienes una cuenta?{' '}
                <button type="button" onClick={() => window.location.href = '/login'} className="text-brand-dark font-black hover:text-brand-gold transition-colors border-b border-brand-dark hover:border-brand-gold">
                  Inicia sesión aquí
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Registro;