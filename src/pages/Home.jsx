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
      {/* Hero Section */}
      <div className="relative h-[400px] mb-16 rounded-3xl overflow-hidden bg-brand-dark flex items-center px-8 sm:px-16">
        <div className="relative z-10 max-w-xl animate-fade-in-up">
          <h1 className="text-5xl font-bold text-white mb-4">Sueños con Estilo</h1>
          <p className="text-brand-gold text-xl mb-8">Descubre nuestra colección exclusiva de pijamas y accesorios premium.</p>
          <Button variant="primary" onClick={() => window.scrollTo({ top: 600, behavior: 'smooth' })}>
            Explorar Colección
          </Button>
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-brand-dark via-transparent to-transparent opacity-60"></div>
        {/* Aquí iría una imagen de fondo de pijamas de lujo */}
        <div className="absolute right-0 top-0 h-full w-1/2 bg-[url('https://images.unsplash.com/photo-1541533260371-b8f25871f7f9?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-40"></div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-gold"></div>
        </div>
      ) : searchQuery ? (
        <>
          <div className="mb-8">
            <h2 className="text-2xl font-bold">Resultados para "{searchQuery}"</h2>
          </div>
          <ProductGallery 
            products={currentProducts} 
            isLoading={isLoading} 
            onAddToCart={(product) => addToCart(product, 1)} 
          />
        </>
      ) : (
        <div className="space-y-20">
          {/* Sección Pijamas */}
          <section>
            <div className="flex justify-between items-end mb-8 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-3xl font-bold text-brand-dark">Pijamas</h2>
                <p className="text-slate-500">Comodidad y elegancia para tus noches</p>
              </div>
            </div>
            <ProductGallery 
              products={filteredProducts.filter(p => p.category === 'Pijamas').slice(0, 4)} 
              isLoading={false} 
              onAddToCart={(product) => addToCart(product, 1)} 
            />
          </section>

          {/* Sección Accesorios */}
          <section>
            <div className="flex justify-between items-end mb-8 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-3xl font-bold text-brand-dark">Accesorios</h2>
                <p className="text-slate-500">Detalles que marcan la diferencia</p>
              </div>
            </div>
            <ProductGallery 
              products={filteredProducts.filter(p => p.category === 'Accesorios').slice(0, 4)} 
              isLoading={false} 
              onAddToCart={(product) => addToCart(product, 1)} 
            />
          </section>
        </div>
      )}

      {/* Paginación - Solo visible si hay búsqueda o si quieres mostrar todos */}
      {searchQuery && totalPages > 1 && (
        <div className="flex justify-center items-center mt-12 mb-10 space-x-2 flex-wrap gap-y-4">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              currentPage === 1 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-white text-slate-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <span className="hidden sm:inline">Anterior</span>
            <span className="sm:inline">&larr;</span>
          </button>
          
          <div className="flex space-x-1 flex-wrap justify-center">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
              <button
                key={number}
                onClick={() => handlePageChange(number)}
                className={`w-10 h-10 rounded-lg font-medium transition-colors flex items-center justify-center ${
                  currentPage === number
                    ? 'bg-brand-dark text-white shadow-md'
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
            <span className="hidden sm:inline">Siguiente</span>
            <span className="sm:inline">&rarr;</span>
          </button>
        </div>
      )}
    </MainLayout>
  );
};

export default Home;
