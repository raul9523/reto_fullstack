import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Header from '../organisms/Header';
import ShoppingCart from '../organisms/ShoppingCart';

const MainLayout = ({ children, user, onLoginClick, onLogoutClick, cartItemCount }) => {
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header 
        user={user} 
        onLoginClick={onLoginClick} 
        onLogoutClick={onLogoutClick} 
        cartItemCount={cartItemCount}
        onCartClick={() => setIsCartOpen(true)}
      />
      
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="bg-white border-t border-gray-200 mt-auto py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-500">
          <p>&copy; {new Date().getFullYear()} DNA Store. All rights reserved.</p>
        </div>
      </footer>

      {/* Shopping Cart Drawer */}
      <ShoppingCart 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
      />
    </div>
  );
};

MainLayout.propTypes = {
  children: PropTypes.node.isRequired,
  user: PropTypes.object,
  onLoginClick: PropTypes.func,
  onLogoutClick: PropTypes.func,
  cartItemCount: PropTypes.number,
};

export default MainLayout;
