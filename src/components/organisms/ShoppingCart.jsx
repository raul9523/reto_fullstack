import React from 'react';
import PropTypes from 'prop-types';
import Button from '../atoms/Button';
import { useCartStore } from '../../store/cartStore';

const ShoppingCart = ({ isOpen, onClose }) => {
  const { items, totalAmount, updateQuantity, removeFromCart, clearCart } = useCartStore();

  // Overlay opacity and drawer transform classes
  const overlayClass = isOpen ? "opacity-100 visible" : "opacity-0 invisible";
  const drawerClass = isOpen ? "translate-x-0" : "translate-x-full";

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 z-[60] transition-all duration-300 ${overlayClass}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div 
        className={`fixed inset-y-0 right-0 w-full md:w-[400px] bg-white shadow-xl z-[70] transform transition-transform duration-300 ease-in-out flex flex-col ${drawerClass}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-slate-800">Tu Carrito</h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 focus:outline-none"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content - Items List */}
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-lg">Tu carrito está vacío</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.product.id} className="flex gap-4 p-3 bg-gray-50 rounded-xl">
                  {/* Image */}
                  <div className="w-20 h-20 bg-white rounded-lg flex-shrink-0 overflow-hidden border border-gray-100">
                    {item.product.imageUrl ? (
                      <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-200" />
                    )}
                  </div>
                  
                  {/* Details */}
                  <div className="flex-1 flex flex-col">
                    <h3 className="text-sm font-bold text-slate-800 line-clamp-2">{item.product.name}</h3>
                    <p className="text-brand-blue font-semibold mt-1">
                      ${item.product.price.toLocaleString('es-MX')}
                    </p>
                    
                    {/* Quantity Controls & Remove */}
                    <div className="flex items-center justify-between mt-auto pt-2">
                      <div className="flex items-center border border-gray-200 rounded-lg bg-white">
                        <button 
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="px-2 py-1 text-slate-500 hover:text-brand-blue"
                        >-</button>
                        <span className="px-2 py-1 text-sm font-medium text-slate-700 min-w-[2rem] text-center">
                          {item.quantity}
                        </span>
                        <button 
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="px-2 py-1 text-slate-500 hover:text-brand-blue"
                          disabled={item.quantity >= item.product.stockQuantity}
                        >+</button>
                      </div>
                      
                      <button 
                        onClick={() => removeFromCart(item.product.id)}
                        className="p-1 text-red-400 hover:text-red-500 hover:bg-red-50 rounded"
                        title="Eliminar"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer - Total & Checkout */}
        {items.length > 0 && (
          <div className="p-4 bg-gray-50 border-t border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <span className="text-slate-500">Total</span>
              <span className="text-2xl font-bold text-slate-800">
                ${totalAmount.toLocaleString('es-MX')}
              </span>
            </div>
            
            <Button className="w-full py-3 text-lg font-semibold" onClick={() => alert("Checkout funcionality coming soon!")}>
              Proceder al Pago
            </Button>
            
            <button 
              onClick={clearCart}
              className="w-full mt-3 text-sm text-slate-400 hover:text-red-500 transition-colors py-2"
            >
              Vaciar carrito
            </button>
          </div>
        )}
      </div>
    </>
  );
};

ShoppingCart.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default ShoppingCart;
