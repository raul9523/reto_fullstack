import React, { useEffect, useState } from 'react';
import MainLayout from '../components/templates/MainLayout';
import ProductGallery from '../components/organisms/ProductGallery';
import useProductStore from '../store/productStore';
import { useCartStore } from '../store/cartStore';

const Home = () => {
  const { filteredProducts, fetchProducts, isLoading, searchQuery } = useProductStore();
  const { addToCart, itemCount } = useCartStore();

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Resetear a página 1 cuando cambia la búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Fetch products from Firestore on mount
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Lógica de recorte para la página actual
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    // Hacer scroll suave hacia arriba al cambiar de página
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <MainLayout cartItemCount={itemCount}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Our Products</h1>
        <p className="text-slate-500">Discover our exclusive collection</p>
      </div>
      
      <ProductGallery 
        products={currentProducts} 
        isLoading={isLoading} 
        onAddToCart={(product) => addToCart(product, 1)} 
      />

      {/* Controles de Paginación */}
      {!isLoading && totalPages > 1 && (
        <div className="flex justify-center items-center mt-12 space-x-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              currentPage === 1 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-white text-slate-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Anterior
          </button>
          
          <div className="flex space-x-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
              <button
                key={number}
                onClick={() => handlePageChange(number)}
                className={`w-10 h-10 rounded-lg font-medium transition-colors flex items-center justify-center ${
                  currentPage === number
                    ? 'bg-brand-blue text-white shadow-md'
                    : 'bg-white text-slate-700 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {number}
              </button>
            ))}
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              currentPage === totalPages 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-white text-slate-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Siguiente
          </button>
        </div>
      )}
    </MainLayout>
  );
};

export default Home;
