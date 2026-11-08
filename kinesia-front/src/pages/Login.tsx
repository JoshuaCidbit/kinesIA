import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setEnviando(true);

    try {
      await login(email, password);
      // En caso de éxito, App deja de renderizar <Login /> porque `usuario` cambia.
      navigate('/', { replace: true });
    } catch (err) {
      const status = (err as { status?: number } | null)?.status;
      setError(
        status === 429
          ? 'Demasiados intentos. Intenta de nuevo en unos minutos.'
          : 'Correo o contraseña incorrectos'
      );
      setEnviando(false);
    }
  };

  return (
    <div className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="brand login-brand"><i />KinesIA</div>

        <h1 id="login-title">Iniciar sesión</h1>
        <p className="sub">Accede a tu panel de rehabilitación.</p>

        <form onSubmit={enviar} aria-busy={enviando}>
          <label className="field" htmlFor="login-email">
            Correo electrónico
            <input
              id="login-email"
              className="input"
              type="email"
              autoComplete="username"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-describedby={error ? 'login-error' : undefined}
            />
          </label>

          <label className="field" htmlFor="login-password">
            Contraseña
            <input
              id="login-password"
              className="input"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              aria-describedby={error ? 'login-error' : undefined}
            />
          </label>

          {error && (
            <p id="login-error" role="alert" className="msg-err">{error}</p>
          )}

          <button type="submit" className="btn pri" disabled={enviando}>
            {enviando ? 'Ingresando…' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="muted login-foot">
          ¿No tienes cuenta? Contacta a tu coach o al administrador.
        </p>
      </section>
    </div>
  );
}
