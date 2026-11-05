import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    setEnviando(true);

    try {
      await login(email, password);
      // En caso de éxito, App deja de renderizar <Login /> porque `usuario` cambia.
    } catch (err) {
      setError(
        err?.status === 429
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
          <label className="field">
            Correo electrónico
            <input
              className="input"
              type="email"
              autoComplete="username"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className="field">
            Contraseña
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          {error && (
            <p role="alert" className="msg-err">{error}</p>
          )}

          <button type="submit" className="btn pri" disabled={enviando}>
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className="muted login-foot">
          ¿No tienes cuenta? Contacta a tu coach o al administrador.
        </p>
      </section>
    </div>
  );
}
