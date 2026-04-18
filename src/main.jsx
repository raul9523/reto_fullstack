import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './main.css'
import Home from './pages/Home.jsx';
import Registro from './registro/Registro.jsx';
import Checkout from './pages/Checkout.jsx';
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
  
  if (window.location.pathname === '/checkout') {
    return <Checkout />;
  }

  return <Home />;
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
