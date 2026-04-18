import React, { useState } from 'react';
import { useUserStore } from '../store/userStore';
import Input from '../components/atoms/Input';
import Button from '../components/atoms/Button';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  const { login, resetPassword, isLoading } = useUserStore();

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setAuthError(null);
    setSuccessMessage(null);

    if (!email) {
      setAuthError("Por favor ingresa tu correo electrónico para restablecer la contraseña.");
      return;
    }

    try {
      await resetPassword(email);
      setSuccessMessage("Se ha enviado un correo para restablecer tu contraseña. Revisa tu bandeja de entrada.");
    } catch (error) {
      setAuthError("Error al enviar el correo: " + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError(null);
    
    try {
      await login(email, password);
      // Redirigir al inicio tras login exitoso
      window.location.href = '/';
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      // Traducir algunos errores comunes de Firebase
      if (error.code === 'auth/invalid-credential') {
        setAuthError("Correo o contraseña incorrectos.");
      } else if (error.code === 'auth/user-not-found') {
        setAuthError("No existe una cuenta con este correo.");
      } else if (error.code === 'auth/wrong-password') {
        setAuthError("Contraseña incorrecta.");
      } else {
        setAuthError("Error al iniciar sesión: " + error.message);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 sm:p-10 rounded-2xl shadow-dna border border-gray-100">
        
        <div className="text-center">
          <div className="flex justify-center items-center mb-4 cursor-pointer" onClick={() => window.location.href = '/'}>
            <span className="text-3xl font-bold text-brand-blue">DÚO</span>
            <span className="text-3xl font-bold text-slate-800 ml-1">DREAMS</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800">
            Bienvenido de nuevo
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Ingresa tus credenciales para acceder
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              id="email"
              type="email"
              label="Correo Electrónico"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            
            <Input
              id="password"
              type="password"
              label="Contraseña"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {authError && (
            <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm animate-shake">
              {authError}
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-green-100 text-green-700 rounded-lg text-sm">
              {successMessage}
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-brand-blue focus:ring-brand-blue border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-slate-600">
                Recordarme
              </label>
            </div>

            <div className="text-sm">
              <a 
                href="#" 
                onClick={handleForgotPassword}
                className="font-medium text-brand-blue hover:text-blue-500 transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </a>
            </div>
          </div>

          <div>
            <Button 
              type="submit" 
              disabled={isLoading} 
              className="w-full py-3 text-lg font-semibold flex justify-center items-center"
            >
              {isLoading ? (
                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></span>
              ) : null}
              {isLoading ? 'Iniciando sesión...' : 'Entrar'}
            </Button>
          </div>

          <div className="text-center mt-6">
            <p className="text-sm text-slate-600">
              ¿No tienes una cuenta?{' '}
              <a 
                href="/registro" 
                className="font-bold text-brand-blue hover:text-blue-500 transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = '/registro';
                }}
              >
                Regístrate aquí
              </a>
            </p>
          </div>
          
        </form>
      </div>
    </div>
  );
};

export default Login;
