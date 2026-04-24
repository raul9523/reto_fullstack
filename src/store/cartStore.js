import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const makeItemKey = (productId, sizeInfo) =>
  sizeInfo ? `${productId}__${sizeInfo.gender || ''}__${sizeInfo.size}` : productId;

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      totalAmount: 0,
      itemCount: 0,

      addToCart: (product, quantity = 1, sizeInfo = null) => {
        set((state) => {
          const itemKey = makeItemKey(product.id, sizeInfo);
          const existingIndex = state.items.findIndex(i => i.itemKey === itemKey);
          let newItems = [...state.items];

          if (existingIndex >= 0) {
            newItems[existingIndex] = { ...newItems[existingIndex], quantity: newItems[existingIndex].quantity + quantity };
          } else {
            newItems.push({
              itemKey,
              product,
              quantity,
              sizeInfo,
              isBackorder: product.stockQuantity === 0,
            });
          }

          return { items: newItems, ...calculateTotals(newItems) };
        });
      },

      removeFromCart: (itemKey) => {
        set((state) => {
          const newItems = state.items.filter(i => i.itemKey !== itemKey);
          return { items: newItems, ...calculateTotals(newItems) };
        });
      },

      updateQuantity: (itemKey, quantity) => {
        set((state) => {
          if (quantity <= 0) {
            const newItems = state.items.filter(i => i.itemKey !== itemKey);
            return { items: newItems, ...calculateTotals(newItems) };
          }
          const newItems = state.items.map(i => i.itemKey === itemKey ? { ...i, quantity } : i);
          return { items: newItems, ...calculateTotals(newItems) };
        });
      },

      clearCart: () => set({ items: [], totalAmount: 0, itemCount: 0 }),
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

const calculateTotals = (items) =>
  items.reduce(
    (totals, item) => {
      const price = item.product.discount > 0
        ? item.product.price - (item.product.price * item.product.discount / 100)
        : item.product.price;
      totals.itemCount += item.quantity;
      totals.totalAmount += price * item.quantity;
      return totals;
    },
    { totalAmount: 0, itemCount: 0 }
  );
