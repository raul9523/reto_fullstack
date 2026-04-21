import { create } from 'zustand';
import { db } from '../firebase/firebase.config';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';

const DEFAULT_SETTINGS = {
  shippingCost: 15000,
  shippingOnDelivery: false,
  logoUrl: '',
  paymentMethods: {
    pse: true,
    transferencia: true,
    contraentrega: true
  },
  emailConfig: {
    user: '',
    pass: ''
  },
  emailNotifications: {
    onOrderPlaced: true,
    onPaymentConfirmed: true,
    onDispatched: true
  }
};

export const useSettingsStore = create((set) => ({
  settings: DEFAULT_SETTINGS,
  isLoading: false,

  fetchSettings: async () => {
    set({ isLoading: true });
    try {
      const settingsRef = doc(db, 'settings', 'global');
      const docSnap = await getDoc(settingsRef);

      if (docSnap.exists()) {
        // Merge with defaults so new fields appear even on old documents
        const merged = {
          ...DEFAULT_SETTINGS,
          ...docSnap.data(),
          emailConfig: { ...DEFAULT_SETTINGS.emailConfig, ...(docSnap.data().emailConfig || {}) },
          emailNotifications: { ...DEFAULT_SETTINGS.emailNotifications, ...(docSnap.data().emailNotifications || {}) },
          paymentMethods: { ...DEFAULT_SETTINGS.paymentMethods, ...(docSnap.data().paymentMethods || {}) }
        };
        set({ settings: merged, isLoading: false });
      } else {
        await setDoc(settingsRef, DEFAULT_SETTINGS);
        set({ settings: DEFAULT_SETTINGS, isLoading: false });
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
