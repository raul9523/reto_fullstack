import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './main.css'
import Home from './pages/Home.jsx';
import Registro from './registro/Registro.jsx';

// Router temporal ultra simple
const App = () => {
  if (window.location.pathname === '/registro') {
    return <Registro />;
  }
  return <Home />;
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
