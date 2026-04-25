import { create } from 'zustand';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/firebase.config.js';
import { useTenantStore } from './tenantStore';

const SUBSCRIPTION_CATEGORY = 'Planes de Suscripción';

const toPlanProduct = (plan) => ({
  id: `plan_${plan.id}`,
  sourceId: plan.id,
  name: plan.name || 'Plan',
  description: plan.description || `Plan ${plan.name || ''} con módulos incluidos para tu tienda.`,
  price: Number(plan.price) || 0,
  discount: 0,
  imageUrl: plan.imageUrl || 'https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&q=80&w=1200',
  images: [],
  stockQuantity: 999999,
  category: SUBSCRIPTION_CATEGORY,
  isPromo: false,
  isActive: plan.isPublishedInStore !== false,
  isSubscription: true,
  planId: plan.id,
  modules: plan.modules || {},
  trialDays: Number(plan.trialDays || 0),
  maxProducts: Number(plan.maxProducts ?? 0),
  maxAdmins: Number(plan.maxAdmins ?? 1),
  order: Number(plan.order || 0),
});

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
      const tenantId = useTenantStore.getState().tenant?.id || 'global';
      // Descargar TODAS las categorías sin filtros iniciales para no perder nada
      const querySnapshot = await getDocs(collection(db, "categories"));
      const cats = [];
      querySnapshot.forEach((doc) => {
        cats.push({ id: doc.id, ...doc.data() });
      });

      const tenantCategories = cats.filter((cat) => {
        if (tenantId === 'global') return !cat.storeId || cat.storeId === 'global';
        return cat.storeId === tenantId;
      });
      
      // Ordenar en memoria: los activos primero, y respetar el orden si existe
      const sorted = tenantCategories.sort((a, b) => {
        // Primero por estado activo
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        // Luego por el campo 'order'
        return (a.order || 99) - (b.order || 99);
      });

      const plansSnap = await getDocs(collection(db, 'plans'));
      const hasPublishedPlans = plansSnap.docs.some(d => d.data().isPublishedInStore !== false);
      if (tenantId === 'global' && hasPublishedPlans && !sorted.some(c => c.name === SUBSCRIPTION_CATEGORY)) {
        sorted.push({
          id: 'subscription_plans',
          name: SUBSCRIPTION_CATEGORY,
          isActive: true,
          order: 998,
        });
      }

      set({ categories: sorted });
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  },

  // Acción para descargar los productos reales desde Firestore
  fetchProducts: async () => {
    set({ isLoading: true, error: null, products: [], filteredProducts: [] });
    try {
      const tenantId = useTenantStore.getState().tenant?.id || 'global';
      const querySnapshot = await getDocs(collection(db, 'products'));
      const plansSnap = await getDocs(collection(db, 'plans'));
      const allProducts = [];
      querySnapshot.forEach((doc) => {
        allProducts.push({ id: doc.id, ...doc.data() });
      });

      const publishedPlanProducts = tenantId === 'global'
        ? plansSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(plan => plan.isPublishedInStore !== false)
          .map(toPlanProduct)
        : [];
      
      // Filtrar por activos para la tienda
      const tenantProducts = allProducts.filter((p) => {
        if (tenantId === 'global') return (!p.storeId || p.storeId === 'global') && p.isActive !== false;
        return p.storeId === tenantId && p.isActive !== false;
      });
      const activeProducts = [...tenantProducts, ...publishedPlanProducts];
      
      // Ordenar: Promociones primero
      const sortedProducts = activeProducts.sort((a, b) => {
        if (a.isSubscription && !b.isSubscription) return 1;
        if (!a.isSubscription && b.isSubscription) return -1;
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
