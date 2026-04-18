import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [], // Estructura: [{ product: { id, name, price... }, quantity: 1 }]
      totalAmount: 0,
      itemCount: 0,

      // Agregar producto al carrito
      addToCart: (product, quantity = 1) => {
        set((state) => {
          const existingItemIndex = state.items.findIndex(
            (item) => item.product.id === product.id
          );

          let newItems = [...state.items];

          if (existingItemIndex >= 0) {
            // Si ya existe, incrementar la cantidad
            newItems[existingItemIndex].quantity += quantity;
          } else {
            // Si no existe, agregarlo
            newItems.push({ product, quantity });
          }

          // Recalcular totales
          const { totalAmount, itemCount } = calculateTotals(newItems);

          return {
            items: newItems,
            totalAmount,
            itemCount,
          };
        });
      },

      // Eliminar un producto completamente del carrito
      removeFromCart: (productId) => {
        set((state) => {
          const newItems = state.items.filter(
            (item) => item.product.id !== productId
          );

          const { totalAmount, itemCount } = calculateTotals(newItems);

          return {
            items: newItems,
            totalAmount,
            itemCount,
          };
        });
      },

      // Actualizar la cantidad de un producto específico
      updateQuantity: (productId, quantity) => {
        set((state) => {
          if (quantity <= 0) {
            // Si la cantidad es 0 o menor, eliminarlo
            return get().removeFromCart(productId);
          }

          const newItems = state.items.map((item) => {
            if (item.product.id === productId) {
              return { ...item, quantity };
            }
            return item;
          });

          const { totalAmount, itemCount } = calculateTotals(newItems);

          return {
            items: newItems,
            totalAmount,
            itemCount,
          };
        });
      },

      // Vaciar el carrito
      clearCart: () => set({ items: [], totalAmount: 0, itemCount: 0 }),
    }),
    {
      name: 'cart-storage', // Nombre en localStorage
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Función auxiliar para recalcular los totales
const calculateTotals = (items) => {
  return items.reduce(
    (totals, item) => {
      totals.itemCount += item.quantity;
      totals.totalAmount += item.product.price * item.quantity;
      return totals;
    },
    { totalAmount: 0, itemCount: 0 }
  );
};
