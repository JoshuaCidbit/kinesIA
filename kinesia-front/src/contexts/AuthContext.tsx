import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Usuario } from '../lib/types';

const TOKEN_KEY = 'kinesia_token';
const AuthContext = createContext<{
  usuario: Usuario | null;
  cargando: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
} | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de un AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
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
    api<Usuario>('/api/usuarios/me')
      .then(setUsuario)
      .catch(() => logout())
      .finally(() => setCargando(false));
  }, [logout]);

  // Cerrar sesión cuando cualquier llamada reciba 401
  useEffect(() => {
    window.addEventListener('kinesia:unauthorized', logout);
    return () => window.removeEventListener('kinesia:unauthorized', logout);
  }, [logout]);

  const login = async (email: string, password: string) => {
    const data = await api<{ token: string; usuario: Usuario }>('/api/usuarios/login', { method: 'POST', body: { email, password } });
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
