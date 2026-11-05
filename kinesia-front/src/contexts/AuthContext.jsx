import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

const TOKEN_KEY = 'kinesia_token';
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const qc = useQueryClient();
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(() => !!localStorage.getItem(TOKEN_KEY));

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUsuario(null);
    qc.clear();            // no dejar datos del usuario anterior en caché
    location.hash = '';
  }, [qc]);

  // Restaurar sesión al cargar
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    api('/api/usuarios/me')
      .then(setUsuario)
      .catch(() => logout())
      .finally(() => setCargando(false));
  }, [logout]);

  // Cerrar sesión cuando cualquier llamada reciba 401
  useEffect(() => {
    window.addEventListener('kinesia:unauthorized', logout);
    return () => window.removeEventListener('kinesia:unauthorized', logout);
  }, [logout]);

  const login = async (email, password) => {
    const data = await api('/api/usuarios/login', { method: 'POST', body: { email, password } });
    localStorage.setItem(TOKEN_KEY, data.token);
    qc.clear();
    setUsuario(data.usuario);
  };

  return (
    <AuthContext.Provider value={{ usuario, cargando, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}