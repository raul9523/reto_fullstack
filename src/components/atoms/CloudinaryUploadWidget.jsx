import React, { useState, useRef } from 'react';

const CloudinaryUploadWidget = ({
  onUpload,
  multiple = false,
  folder = 'duo-dreams',
  showPreview = true,
  maxFiles = 5,
  label = 'Subir Imagen',
  previewUrl = null,
  onRemovePreview = null
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const apiKey = import.meta.env.VITE_CLOUDINARY_API_KEY;

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      for (const file of files) {
        // Validar tamaño
        if (file.size > 5242880) { // 5MB
          setError('Archivo muy grande (máx 5MB)');
          setIsLoading(false);
          return;
        }

        // Validar formato
        if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
          setError('Formato no válido. Usa JPG, PNG, WebP o GIF');
          setIsLoading(false);
          return;
        }

        // Crear FormData
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'duo_dreams_unsigned'); // Preset sin AUTH
        formData.append('folder', folder);
        formData.append('quality', 'auto:low'); // Optimización automática

        // Upload a Cloudinary
        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          {
            method: 'POST',
            body: formData,
          }
        );

        if (!response.ok) {
          throw new Error('Error al subir imagen');
        }

        const data = await response.json();
        const uploadedUrl = data.secure_url;

        // Si es multiple, agregar a la lista; si no, reemplazar
        if (multiple && fileInputRef.current) {
          onUpload(uploadedUrl);
        } else {
          onUpload(uploadedUrl);
          break; // Solo una imagen si no es multiple
        }
      }
    } catch (err) {
      setError(err.message || 'Error al subir imagen. Verifica tu conexión.');
      console.error('Upload error:', err);
    } finally {
      setIsLoading(false);
      // Limpiar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        disabled={isLoading}
        className="hidden"
        id={`cloudinary-input-${Math.random()}`}
      />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isLoading}
        className="w-full py-3 px-4 rounded-xl bg-brand-gold text-white font-bold text-sm uppercase hover:bg-brand-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            Subiendo...
          </>
        ) : (
          <>
            📸 {label}
          </>
        )}
      </button>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-semibold">
          {error}
        </div>
      )}

      {showPreview && previewUrl && (
        <div className="relative inline-block">
          <img
            src={previewUrl}
            alt="Preview"
            className="w-24 h-24 object-cover rounded-xl border-2 border-brand-gold"
          />
          {onRemovePreview && (
            <button
              type="button"
              onClick={onRemovePreview}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold hover:bg-red-600 transition-all"
            >
              ×
            </button>
          )}
        </div>
      )}

      {isLoading && (
        <p className="text-xs text-slate-400 italic">
          Procesando imagen (compresión y optimización automática)...
        </p>
      )}
    </div>
  );
};

export default CloudinaryUploadWidget;
