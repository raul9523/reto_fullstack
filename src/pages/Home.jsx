import React, { useEffect } from 'react';
import MainLayout from '../components/templates/MainLayout';
import ProductGallery from '../components/organisms/ProductGallery';
import useProductStore from '../store/productStore';
import { useCartStore } from '../store/cartStore';

const Home = () => {
  const { filteredProducts, fetchProducts, isLoading } = useProductStore();
  const { addToCart, itemCount } = useCartStore();

  // Fetch products from Firestore on mount
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return (
    <MainLayout cartItemCount={itemCount}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Our Products</h1>
        <p className="text-slate-500">Discover our exclusive collection</p>
      </div>
      
      <ProductGallery 
        products={filteredProducts} 
        isLoading={isLoading} 
        onAddToCart={(product) => addToCart(product, 1)} 
      />
    </MainLayout>
  );
};

export default Home;
