import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { auth, db } from '../firebase/firebase.config';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const enrichWithSubscription = async (baseUser) => {
  try {
    const subscriptionDoc = await getDoc(doc(db, 'subscriptions', baseUser.uid));
    if (!subscriptionDoc.exists()) return baseUser;
    const sub = subscriptionDoc.data();
    return {
      ...baseUser,
      ownedStoreId: sub.storeId || baseUser.ownedStoreId || null,
      ownedSubdomain: sub.subdomain || baseUser.ownedSubdomain || null,
      subscriptionStatus: sub.status || null,
      subscriptionPlanId: sub.planId || null,
      subscriptionModules: sub.modules || {},
    };
  } catch {
    return baseUser;
  }
};

export const useUserStore = create(
  persist(
    (set, get) => ({
      currentUser: null,
      isLoading: true,
      error: null,

      // Iniciar sesión con Firebase Auth y luego traer datos extra de Firestore
      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          const firebaseUser = userCredential.user;
          
          // Traer datos extra del usuario desde Firestore
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const baseUser = { uid: firebaseUser.uid, email: firebaseUser.email, ...userDoc.data() };
            const enrichedUser = await enrichWithSubscription(baseUser);
            set({ 
              currentUser: enrichedUser,
              isLoading: false 
            });
          } else {
            // Caso raro: está en Auth pero no en Firestore
            set({ 
              currentUser: { uid: firebaseUser.uid, email: firebaseUser.email, firstName: 'Usuario' },
              isLoading: false 
            });
          }
        } catch (error) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      // Registro completo: Auth + Firestore
      registerUser: async (email, password, extraData) => {
        set({ isLoading: true, error: null });
        try {
          // 1. Crear usuario en Firebase Authentication
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const firebaseUser = userCredential.user;

          // 2. Guardar datos adicionales en Firestore
          const isMasterAdmin = firebaseUser.email === 'raulpte0211@gmail.com';
          const userData = {
            ...extraData,
            email: firebaseUser.email,
            role: isMasterAdmin ? 'superadmin' : 'cliente',
            createdAt: new Date().toISOString()
          };
          
          await setDoc(doc(db, 'users', firebaseUser.uid), userData);

          // 3. Actualizar Zustand
          set({ 
            currentUser: { uid: firebaseUser.uid, ...userData },
            isLoading: false 
          });

          return firebaseUser;
        } catch (error) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      // Cerrar sesión
      logout: async () => {
        set({ isLoading: true });
        try {
          await signOut(auth);
          set({ currentUser: null, isLoading: false });
        } catch (error) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      // Recuperar contraseña
      resetPassword: async (email) => {
        set({ isLoading: true, error: null });
        try {
          await sendPasswordResetEmail(auth, email);
          set({ isLoading: false });
        } catch (error) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      // Inicializar el listener de Firebase (se llama en App/MainLayout)
      initAuthListener: () => {
        set({ isLoading: true });
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            try {
              const userDocRef = doc(db, 'users', firebaseUser.uid);
              const userDoc = await getDoc(userDocRef);
              if (userDoc.exists()) {
                const baseUser = { uid: firebaseUser.uid, email: firebaseUser.email, ...userDoc.data() };
                const enrichedUser = await enrichWithSubscription(baseUser);
                set({ 
                  currentUser: enrichedUser,
                  isLoading: false 
                });
              } else {
                set({ currentUser: { uid: firebaseUser.uid, email: firebaseUser.email }, isLoading: false });
              }
            } catch (err) {
              console.error("Error al recuperar datos del usuario:", err);
              set({ isLoading: false });
            }
          } else {
            set({ currentUser: null, isLoading: false });
          }
        });
        return unsubscribe;
      }
    }),
    {
      name: 'dna-user-storage',
      // Persistimos solo el currentUser para carga rápida inicial
      partialize: (state) => ({ currentUser: state.currentUser }),
    }
  )
);
