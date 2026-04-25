import React, { useEffect, useState } from 'react';
import MainLayout from '../components/templates/MainLayout';
import ProductGallery from '../components/organisms/ProductGallery';
import useProductStore from '../store/productStore';
import { useCartStore } from '../store/cartStore';
import Button from '../components/atoms/Button';
import { useTenantStore } from '../store/tenantStore';

const Home = () => {
  const {
    filteredProducts, categories, fetchProducts, fetchCategories,
    isLoading, searchQuery, selectedCategory, setSelectedCategory,
  } = useProductStore();
  const { addToCart, itemCount } = useCartStore();
  const { tenant } = useTenantStore();
  const brandName = tenant?.brandName || 'Duo Dreams';

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => { setCurrentPage(1); }, [searchQuery, selectedCategory]);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddToCart = (product, sizeInfo) => addToCart(product, 1, sizeInfo);

  const activeCategories = categories.filter(c => c.isActive !== false);

  return (
    <MainLayout cartItemCount={itemCount}>
      {/* Hero Section */}
      <div className="relative h-[400px] mb-10 rounded-3xl overflow-hidden bg-brand-dark flex items-center px-8 sm:px-16">
        <div className="relative z-10 max-w-xl animate-fade-in-up">
          <h1 className="text-5xl font-bold text-white mb-4">{brandName}</h1>
          <p className="text-brand-gold text-xl mb-8">Descubre nuestra colección exclusiva de pijamas y accesorios premium.</p>
          <Button variant="primary" onClick={() => window.scrollTo({ top: 600, behavior: 'smooth' })}>
            Explorar Colección
          </Button>
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-brand-dark via-transparent to-transparent opacity-60" />
        <div className="absolute right-0 top-0 h-full w-1/2 bg-[url('https://images.unsplash.com/photo-1541533260371-b8f25871f7f9?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-40" />
      </div>

      {/* Category filter pills */}
      {!isLoading && activeCategories.length > 0 && (
        <div className="mb-10 flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-all ${
              !selectedCategory ? 'bg-brand-dark text-white shadow-md' : 'bg-gray-100 text-slate-500 hover:bg-gray-200'
            }`}
          >
            Todos
          </button>
          {activeCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(selectedCategory === cat.name ? null : cat.name)}
              className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-all ${
                selectedCategory === cat.name ? 'bg-brand-gold text-white shadow-md' : 'bg-gray-100 text-slate-500 hover:bg-gray-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-gold" />
        </div>
      ) : searchQuery || selectedCategory ? (
        <>
          <div className="mb-8">
            {searchQuery && <h2 className="text-2xl font-bold text-brand-dark">Resultados para "{searchQuery}"</h2>}
            {selectedCategory && !searchQuery && <h2 className="text-2xl font-bold text-brand-dark">{selectedCategory}</h2>}
          </div>
          <ProductGallery products={currentProducts} isLoading={isLoading} onAddToCart={handleAddToCart} />
          {totalPages > 1 && (
            <div className="flex justify-center items-center mt-12 mb-10 space-x-2 flex-wrap gap-y-4">
              <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-slate-700 border border-gray-200 hover:bg-gray-50'}`}>
                &larr;
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button key={n} onClick={() => handlePageChange(n)}
                  className={`w-10 h-10 rounded-lg font-medium transition-colors ${n === currentPage ? 'bg-brand-dark text-white shadow-md' : 'bg-white text-slate-700 border border-gray-200 hover:bg-gray-50'}`}>
                  {n}
                </button>
              ))}
              <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-slate-700 border border-gray-200 hover:bg-gray-50'}`}>
                &rarr;
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-20">
          {activeCategories.length > 0 ? (
            activeCategories.map((cat) => {
              const catProducts = filteredProducts.filter(p => p.category === cat.name);
              if (catProducts.length === 0) return null;
              return (
                <section key={cat.id}>
                  <div className="flex justify-between items-end mb-8 border-b border-gray-100 pb-4">
                    <div>
                      <h2 className="text-3xl font-bold text-brand-dark">{cat.name}</h2>
                      <p className="text-slate-500 font-medium tracking-tight">Selección exclusiva de {cat.name.toLowerCase()}</p>
                    </div>
                    {catProducts.length > 4 && (
                      <button onClick={() => setSelectedCategory(cat.name)} className="text-xs font-bold text-brand-gold hover:underline uppercase tracking-wide">
                        Ver todos ({catProducts.length})
                      </button>
                    )}
                  </div>
                  <ProductGallery products={catProducts.slice(0, 4)} isLoading={false} onAddToCart={handleAddToCart} />
                </section>
              );
            })
          ) : (
            <div className="text-center py-20 text-slate-500">
              <p className="text-xl italic">Configurando tu escaparate dinámico...</p>
            </div>
          )}

          {/* Sin categoría */}
          {(() => {
            const uncatProducts = filteredProducts.filter(p => !p.category || p.category === '');
            if (uncatProducts.length === 0) return null;
            return (
              <section>
                <div className="flex justify-between items-end mb-8 border-b border-gray-100 pb-4">
                  <div>
                    <h2 className="text-3xl font-bold text-brand-dark">Novedades</h2>
                    <p className="text-slate-500 font-medium tracking-tight">Nuestros últimos lanzamientos</p>
                  </div>
                </div>
                <ProductGallery products={uncatProducts.slice(0, 8)} isLoading={false} onAddToCart={handleAddToCart} />
              </section>
            );
          })()}
        </div>
      )}
    </MainLayout>
  );
};

export default Home;
