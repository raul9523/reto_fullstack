import { StrictMode, useEffect, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './main.css'
import { useUserStore } from './store/userStore';

const Home = lazy(() => import('./pages/Home.jsx'));
const Registro = lazy(() => import('./registro/Registro.jsx'));
const Login = lazy(() => import('./registro/Login.jsx'));
const Checkout = lazy(() => import('./pages/Checkout.jsx'));
const UserOrders = lazy(() => import('./pages/UserOrders.jsx'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard.jsx'));

const PageFallback = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
    <div style={{ width: 32, height: 32, border: '3px solid #c8a96e', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const App = () => {
  const { initAuthListener } = useUserStore();

  useEffect(() => {
    const unsubscribe = initAuthListener();
    return () => unsubscribe();
  }, [initAuthListener]);

  const path = window.location.pathname;

  let Page = Home;
  if (path === '/registro') Page = Registro;
  else if (path === '/login') Page = Login;
  else if (path === '/checkout') Page = Checkout;
  else if (path === '/mis-pedidos') Page = UserOrders;
  else if (path === '/admin') Page = AdminDashboard;

  return (
    <Suspense fallback={<PageFallback />}>
      <Page />
    </Suspense>
  );
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
