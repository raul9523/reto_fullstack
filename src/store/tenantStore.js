import { create } from 'zustand';
import { db } from '../firebase/firebase.config';
import { collection, getDocs, query, where, limit, doc, getDoc } from 'firebase/firestore';

const DEFAULT_TENANT = {
  id: 'global',
  brandName: 'Duo Dreams',
  logoUrl: '',
  subdomain: null,
};

const isReservedSubdomain = (value) => ['www', 'app', 'admin'].includes(value);

const resolveSubdomain = () => {
  const url = new URL(window.location.href);
  const forced = (url.searchParams.get('store') || '').toLowerCase().trim();
  if (forced) return forced;

  const host = window.location.hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1') return null;

  const parts = host.split('.');
  if (parts.length >= 3) {
    const maybeSubdomain = parts[0];
    if (!isReservedSubdomain(maybeSubdomain)) return maybeSubdomain;
  }

  return null;
};

export const useTenantStore = create((set) => ({
  tenant: DEFAULT_TENANT,
  isLoadingTenant: false,

  initTenant: async () => {
    const subdomain = resolveSubdomain();
    if (!subdomain) {
      set({ tenant: DEFAULT_TENANT, isLoadingTenant: false });
      return;
    }

    set({ isLoadingTenant: true });

    try {
      const storeSnap = await getDocs(query(collection(db, 'stores'), where('subdomain', '==', subdomain), limit(1)));
      if (storeSnap.empty) {
        set({ tenant: { ...DEFAULT_TENANT, subdomain }, isLoadingTenant: false });
        return;
      }

      const storeDoc = storeSnap.docs[0];
      const storeData = { id: storeDoc.id, ...storeDoc.data() };

      const settingsSnap = await getDoc(doc(db, 'store_settings', storeDoc.id));
      const storeSettings = settingsSnap.exists() ? settingsSnap.data() : {};

      const tenant = {
        id: storeDoc.id,
        subdomain: storeData.subdomain,
        brandName: storeSettings.brandName || storeData.brandName || DEFAULT_TENANT.brandName,
        logoUrl: storeSettings.logoUrl || '',
        modules: storeData.modules || {},
        planName: storeData.planName || '',
      };

      document.title = `${tenant.brandName} | Tienda`;
      set({ tenant, isLoadingTenant: false });
    } catch (error) {
      console.error('Error inicializando tenant:', error);
      set({ tenant: DEFAULT_TENANT, isLoadingTenant: false });
    }
  },
}));
