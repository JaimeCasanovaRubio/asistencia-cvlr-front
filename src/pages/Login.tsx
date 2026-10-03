import { useState } from 'react';
import { api } from '../api/client';

interface LoginProps {
  onLoginSuccess: () => void;
}

export const Login = ({ onLoginSuccess }: LoginProps) => {
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Campos del formulario
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (isRegistering) {
        // 1. REGISTRO: Enviar JSON a la ruta de registro (ajusta la ruta según auth.py)
        await api.post('/auth/register', {
          name,
          email,
          password,
        });
      }

      // 2. LOGIN AUTOMÁTICO (o inicio de sesión normal)
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await api.post('/auth/token', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      localStorage.setItem('token', response.data.access_token);
      onLoginSuccess();
    } catch (err: any) {
      if (err.response) {
        const detail = err.response.data?.detail;
        if (typeof detail === 'string') {
          setErrorMsg(detail);
        } else if (err.response.status === 401) {
          setErrorMsg('Email o contraseña incorrectos');
        } else {
          setErrorMsg('Error en la solicitud. Revisa los datos.');
        }
      } else {
        setErrorMsg('Error al conectar con el servidor.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl bg-slate-800 p-6 shadow-xl border border-slate-700">
        <h1 className="text-2xl font-bold text-center text-white mb-1">CVLR Asistencia</h1>
        <p className="text-sm text-center text-slate-400 mb-6">
          {isRegistering ? 'Crea tu cuenta de entrenador' : 'Inicia sesión con tu cuenta'}
        </p>

        {errorMsg && (
          <div className="mb-4 rounded-lg bg-red-900/50 border border-red-500/50 p-3 text-sm text-red-200 text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegistering && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Nombre Completo
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Entrenador / Nombre"
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="entrenador@club.com"
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Contraseña
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-500 active:scale-[0.98] transition disabled:opacity-50 mt-2"
          >
            {loading
              ? 'Procesando...'
              : isRegistering
              ? 'Registrarse y Entrar'
              : 'Entrar'}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-slate-700/60 pt-4">
          <button
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setErrorMsg('');
            }}
            className="text-xs text-blue-400 hover:underline"
          >
            {isRegistering
              ? '¿Ya tienes una cuenta? Inicia sesión'
              : '¿No tienes cuenta? Regístrate aquí'}
          </button>
        </div>
      </div>
    </div>
  );
};