import { create } from 'zustand';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/firebase.config.js';

const useProductStore = create((set, get) => ({
  // Estado inicial
  products: [],
  categories: [],
  filteredProducts: [],
  searchQuery: '',
  selectedCategory: null,
  isLoading: false,
  error: null,

  // Acción para descargar categorías
  fetchCategories: async () => {
    try {
      // Descargar TODAS las categorías sin filtros iniciales para no perder nada
      const querySnapshot = await getDocs(collection(db, "categories"));
      const cats = [];
      querySnapshot.forEach((doc) => {
        cats.push({ id: doc.id, ...doc.data() });
      });
      
      // Ordenar en memoria: los activos primero, y respetar el orden si existe
      const sorted = cats.sort((a, b) => {
        // Primero por estado activo
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        // Luego por el campo 'order'
        return (a.order || 99) - (b.order || 99);
      });

      set({ categories: sorted });
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  },

  // Acción para descargar los productos reales desde Firestore
  fetchProducts: async () => {
    set({ isLoading: true, error: null, products: [], filteredProducts: [] });
    try {
      const querySnapshot = await getDocs(collection(db, "products"));
      const allProducts = [];
      querySnapshot.forEach((doc) => {
        allProducts.push({ id: doc.id, ...doc.data() });
      });
      
      // Filtrar por activos para la tienda
      const activeProducts = allProducts.filter(p => p.isActive !== false);
      
      // Ordenar: Promociones primero
      const sortedProducts = activeProducts.sort((a, b) => {
        if (a.isPromo && !b.isPromo) return -1;
        if (!a.isPromo && b.isPromo) return 1;
        return (a.order || 0) - (b.order || 0);
      });

      set({ 
        products: sortedProducts, 
        filteredProducts: sortedProducts,
        isLoading: false 
      });
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
        ? product.category === selectedCategory 
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

  setSelectedCategory: (categoryName) => {
    set({ selectedCategory: categoryName });
    get().applyFilters();
  },
}));

export default useProductStore;
