import { create } from 'zustand';
import { db } from '../firebase/firebase.config';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';

export const useSettingsStore = create((set) => ({
  settings: {
    shippingCost: 0,
    shippingOnDelivery: false,
    logoUrl: '',
    paymentMethods: {
      pse: true,
      transferencia: true,
      contraentrega: true
    }
  },
  isLoading: false,

  fetchSettings: async () => {
    set({ isLoading: true });
    try {
      const settingsRef = doc(db, 'settings', 'global');
      const docSnap = await getDoc(settingsRef);
      
      if (docSnap.exists()) {
        set({ settings: docSnap.data(), isLoading: false });
      } else {
        // Inicializar si no existe
        const initial = {
          shippingCost: 15000,
          shippingOnDelivery: false,
          logoUrl: '',
          paymentMethods: {
            pse: true,
            transferencia: true,
            contraentrega: true
          }
        };
        await setDoc(settingsRef, initial);
        set({ settings: initial, isLoading: false });
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      set({ isLoading: false });
    }
  },

  updateSettings: async (newSettings) => {
    set({ isLoading: true });
    try {
      const settingsRef = doc(db, 'settings', 'global');
      await updateDoc(settingsRef, newSettings);
      set({ settings: newSettings, isLoading: false });
    } catch (error) {
      console.error("Error updating settings:", error);
      set({ isLoading: false });
      throw error;
    }
  }
}));
