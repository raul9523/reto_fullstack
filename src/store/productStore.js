import { create } from 'zustand';
import { products as mockProducts } from '../mockdata/products';

const useProductStore = create((set) => ({
  // Estado inicial
  products: mockProducts,
  filteredProducts: mockProducts,
  searchQuery: '',
  selectedCategory: null,

  // Acciones
  setProducts: (newProducts) => set({ 
    products: newProducts, 
    filteredProducts: newProducts 
  }),

  setSearchQuery: (query) => set((state) => {
    // Si la búsqueda está vacía, mostramos todos los productos (o los de la categoría seleccionada)
    if (!query.trim()) {
      const filtered = state.selectedCategory 
        ? state.products.filter(p => p.categoryId === state.selectedCategory)
        : state.products;
        
      return { searchQuery: query, filteredProducts: filtered };
    }

    // Filtramos ignorando mayúsculas y acentos
    const lowerQuery = query.toLowerCase();
    const filtered = state.products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(lowerQuery) || 
                           product.description.toLowerCase().includes(lowerQuery);
      const matchesCategory = state.selectedCategory ? product.categoryId === state.selectedCategory : true;
      
      return matchesSearch && matchesCategory;
    });

    return { searchQuery: query, filteredProducts: filtered };
  }),

  setSelectedCategory: (categoryId) => set((state) => {
    const newCategory = categoryId;
    
    // Aplicamos los filtros combinados (categoría + búsqueda)
    const filtered = state.products.filter((product) => {
      const matchesCategory = newCategory ? product.categoryId === newCategory : true;
      const matchesSearch = state.searchQuery 
        ? product.name.toLowerCase().includes(state.searchQuery.toLowerCase()) || 
          product.description.toLowerCase().includes(state.searchQuery.toLowerCase())
        : true;
        
      return matchesCategory && matchesSearch;
    });

    return { selectedCategory: newCategory, filteredProducts: filtered };
  }),
}));

export default useProductStore;
