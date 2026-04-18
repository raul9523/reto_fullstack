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
      // Intentar con ordenamiento de Firestore
      const q = query(collection(db, "categories"), orderBy('order', 'asc'));
      const querySnapshot = await getDocs(q);
      const cats = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.isActive !== false) {
          cats.push({ id: doc.id, ...data });
        }
      });
      set({ categories: cats });
    } catch (error) {
      console.warn("Falling back to client-side sorting for categories:", error);
      // Fallback: Cargar todos y ordenar en el cliente si falla Firestore (ej: por falta de índice)
      const querySnapshot = await getDocs(collection(db, "categories"));
      const cats = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.isActive !== false) {
          cats.push({ id: doc.id, ...data });
        }
      });
      // Ordenar manualmente: los que tienen 'order' primero, luego por nombre
      const sorted = cats.sort((a, b) => (a.order || 99) - (b.order || 99));
      set({ categories: sorted });
    }
  },

  // Acción para descargar los productos reales desde Firestore
  fetchProducts: async () => {
    set({ isLoading: true, error: null });
    try {
      const querySnapshot = await getDocs(collection(db, "products"));
      const allProducts = [];
      querySnapshot.forEach((doc) => {
        allProducts.push({ id: doc.id, ...doc.data() });
      });
      
      // Ordenar: Promociones primero
      const sortedProducts = allProducts.sort((a, b) => {
        if (a.isPromo && !b.isPromo) return -1;
        if (!a.isPromo && b.isPromo) return 1;
        return 0;
      });

      set({ 
        products: sortedProducts, 
        filteredProducts: sortedProducts,
        isLoading: false 
      });
      
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
