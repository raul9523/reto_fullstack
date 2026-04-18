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
    <div className="min-h-screen bg-brand-dark flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-gold/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-gold/5 rounded-full blur-3xl"></div>

      {/* Botón Volver */}
      <button 
        onClick={() => window.location.href = '/'}
        className="absolute top-8 left-8 text-slate-500 hover:text-brand-gold transition-colors flex items-center gap-2 font-bold text-[10px] uppercase tracking-[0.2em]"
      >
        &larr; Volver
      </button>

      <div className="w-full max-w-md animate-fade-in relative z-10">
        <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden border border-brand-gold/10">
          <div className="bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] p-12 text-center border-b border-brand-gold/20">
            <h1 className="text-4xl font-black text-brand-gold tracking-tighter uppercase mb-2">DÚO DREAMS</h1>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em]">Luxury Sleepwear</p>
          </div>

          <form className="p-10 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-5">
              <Input 
                id="email" 
                label="Correo Electrónico" 
                type="email"
                placeholder="tu@email.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <div className="space-y-2">
                <Input 
                  id="password" 
                  label="Contraseña" 
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <div className="text-right">
                  <button 
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-[9px] text-brand-gold font-bold hover:underline uppercase tracking-widest"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              </div>
            </div>

            {authError && (
              <div className="p-3 bg-red-50 text-red-500 rounded-xl text-[10px] font-bold uppercase tracking-widest text-center animate-shake border border-red-100">
                {authError}
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-green-50 text-green-600 rounded-xl text-[10px] font-bold uppercase tracking-widest text-center border border-green-100">
                {successMessage}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full py-4 rounded-2xl shadow-xl shadow-brand-gold/10 text-xs font-bold uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98]"
              disabled={isLoading}
            >
              {isLoading ? 'Verificando...' : 'Iniciar Sesión'}
            </Button>

            <div className="text-center pt-4">
              <p className="text-slate-400 text-[10px] uppercase tracking-widest font-bold">
                ¿No tienes cuenta?{' '}
                <button 
                  type="button"
                  onClick={() => window.location.href = '/registro'}
                  className="text-brand-dark font-black hover:text-brand-gold transition-colors border-b border-brand-dark hover:border-brand-gold pb-0.5"
                >
                  Regístrate aquí
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
