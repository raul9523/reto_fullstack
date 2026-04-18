import React from 'react';
import PropTypes from 'prop-types';
import Button from '../atoms/Button';
import useProductStore from '../../store/productStore';
import { useUserStore } from '../../store/userStore';

const Header = ({ user, onLoginClick, onLogoutClick, cartItemCount = 0, onCartClick }) => {
  const { searchQuery, setSearchQuery } = useProductStore();
  const { currentUser, logout } = useUserStore();

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo / Brand */}
          <div className="flex-shrink-0 flex items-center cursor-pointer">
            <span className="text-2xl font-bold text-brand-blue">DNA</span>
            <span className="text-2xl font-bold text-slate-800">Store</span>
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <input 
                type="text" 
                placeholder="Buscar productos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-full py-2 px-4 pl-10 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all"
              />
              <svg 
                className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Actions / User Profile */}
          <div className="flex items-center space-x-4">
            
            {/* Cart Icon */}
            <div 
              className="relative cursor-pointer text-slate-600 hover:text-brand-blue transition-colors"
              onClick={onCartClick}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </div>

            {/* User Auth state */}
            {currentUser ? (
              <div className="flex items-center space-x-3">
                <div className="hidden sm:block text-sm">
                  <p className="text-slate-800 font-medium">
                    Hola, {currentUser.firstName || currentUser.email.split('@')[0]}
                  </p>
                </div>
                <Button variant="secondary" onClick={logout} className="px-3 py-1.5 text-sm">
                  Cerrar Sesión
                </Button>
              </div>
            ) : (
              <Button variant="primary" onClick={() => window.location.href = '/registro'} className="px-4 py-2 text-sm">
                Registrarse
              </Button>
            )}

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button className="text-slate-600 hover:text-brand-blue focus:outline-none">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
          
        </div>
      </div>
    </header>
  );
};

Header.propTypes = {
  user: PropTypes.shape({
    displayName: PropTypes.string,
    email: PropTypes.string,
  }),
  onLoginClick: PropTypes.func,
  onLogoutClick: PropTypes.func,
  cartItemCount: PropTypes.number,
  onCartClick: PropTypes.func,
};

export default Header;
