import { create } from 'zustand';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebase.config.js';

const useProductStore = create((set, get) => ({
  // Estado inicial
  products: [],
  filteredProducts: [],
  searchQuery: '',
  selectedCategory: null,
  isLoading: false,
  error: null,

  // Acción para descargar los productos reales desde Firestore
  fetchProducts: async () => {
    set({ isLoading: true, error: null });
    try {
      const querySnapshot = await getDocs(collection(db, "products"));
      const productsData = [];
      querySnapshot.forEach((doc) => {
        // Obtenemos los datos y mantenemos el ID del documento
        productsData.push({ id: doc.id, ...doc.data() });
      });
      
      set({ 
        products: productsData, 
        filteredProducts: productsData,
        isLoading: false 
      });
      
      // Aplicar filtros existentes por si se recargaron los datos mientras había una búsqueda
      get().applyFilters();
      
    } catch (error) {
      console.error("Error fetching products:", error);
      set({ error: error.message, isLoading: false });
    }
  },

  // Acción interna para reaplicar filtros combinados (búsqueda y categoría)
  applyFilters: () => set((state) => {
    const { products, searchQuery, selectedCategory } = state;
    const lowerQuery = searchQuery.toLowerCase().trim();

    const filtered = products.filter((product) => {
      const matchesSearch = lowerQuery
        ? product.name.toLowerCase().includes(lowerQuery) || 
          product.description.toLowerCase().includes(lowerQuery)
        : true;
        
      const matchesCategory = selectedCategory 
        ? product.categoryId === selectedCategory 
        : true;
      
      return matchesSearch && matchesCategory;
    });

    return { filteredProducts: filtered };
  }),

  // Acciones de interacción del usuario
  setSearchQuery: (query) => {
    set({ searchQuery: query });
    get().applyFilters();
  },

  setSelectedCategory: (categoryId) => {
    set({ selectedCategory: categoryId });
    get().applyFilters();
  },
}));

export default useProductStore;
