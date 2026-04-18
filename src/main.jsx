import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './main.css'
import Home from './pages/Home.jsx';
import Registro from './registro/Registro.jsx';
import Login from './registro/Login.jsx';
import Checkout from './pages/Checkout.jsx';
import UserOrders from './pages/UserOrders.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import { useUserStore } from './store/userStore';

// Router temporal ultra simple
const App = () => {
  const { initAuthListener } = useUserStore();

  useEffect(() => {
    const unsubscribe = initAuthListener();
    return () => unsubscribe();
  }, [initAuthListener]);

  if (window.location.pathname === '/registro') {
    return <Registro />;
  }
  
  if (window.location.pathname === '/login') {
    return <Login />;
  }
  
  if (window.location.pathname === '/checkout') {
    return <Checkout />;
  }

  if (window.location.pathname === '/mis-pedidos') {
    return <UserOrders />;
  }

  if (window.location.pathname === '/admin') {
    return <AdminDashboard />;
  }

  return <Home />;
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
