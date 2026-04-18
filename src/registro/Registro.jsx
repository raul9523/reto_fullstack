import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebase.config.js';
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
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    documentType: '',
    documentNumber: '',
    dv: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    birthDate: ''
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

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Datos de registro:", formData);
    alert("Revisa la consola para ver los datos enviados.");
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
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8 bg-white p-10 rounded-2xl shadow-dna border border-gray-100">
        
        <div>
          <h2 className="text-center text-3xl font-extrabold text-slate-800">
            Crear una cuenta
          </h2>
          <p className="mt-2 text-center text-sm text-slate-500">
            Únete a DNA Store
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            
            {/* Tipo de Documento */}
            <div className="sm:col-span-2">
              <label htmlFor="documentType" className="block text-slate-400 text-lg mb-1">
                Tipo de Documento
              </label>
              <select
                id="documentType"
                value={formData.documentType}
                onChange={handleDocTypeChange}
                className="w-full input-dna bg-white"
                required
              >
                {docTypes.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Número de Documento y DV */}
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
            
            {/* Dígito de Verificación (Solo Empresas) */}
            {currentTypeIsCompany && (
              <div className="sm:col-span-1">
                <Input
                  id="dv"
                  label="Dígito de Verificación (DV)"
                  value={formData.dv}
                  readOnly
                  disabled
                  className="bg-gray-100 cursor-not-allowed"
                />
              </div>
            )}

            {/* Nombres y Apellidos */}
            <Input
              id="firstName"
              label={currentTypeIsCompany ? "Razón Social / Nombres" : "Nombres"}
              placeholder="Ej. Juan"
              value={formData.firstName}
              onChange={handleChange}
              required
            />
            
            <Input
              id="lastName"
              label={currentTypeIsCompany ? "Apellidos (Opcional)" : "Apellidos"}
              placeholder="Ej. Pérez"
              value={formData.lastName}
              onChange={handleChange}
              required={!currentTypeIsCompany}
            />

            {/* Correo y Celular */}
            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                id="email"
                type="email"
                label="Correo Electrónico"
                placeholder="juan@ejemplo.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
              <Input
                id="phone"
                type="tel"
                label="Celular"
                placeholder="300 000 0000"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </div>

            {/* Dirección */}
            <div className="sm:col-span-2">
              <Input
                id="address"
                label="Dirección"
                placeholder="Calle 123 # 45-67"
                value={formData.address}
                onChange={handleChange}
                required
              />
            </div>

            {/* Fecha de Nacimiento (Solo Personas Naturales) */}
            {!currentTypeIsCompany && (
              <div className="sm:col-span-2">
                <Input
                  id="birthDate"
                  type="date"
                  label="Fecha de Nacimiento"
                  value={formData.birthDate}
                  onChange={handleChange}
                  required
                />
              </div>
            )}
            
          </div>

          <div>
            <Button type="submit" className="w-full py-3 text-lg font-semibold">
              Registrarse
            </Button>
          </div>
          
        </form>
      </div>
    </div>
  );
};

export default Registro;