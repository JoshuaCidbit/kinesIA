import { puedeAcceder } from '../lib/rutas';
import type { ReactNode } from 'react';

// Guard de rol: renderiza los hijos solo si el rol autenticado puede ver la
// vista. Sin usuario autenticado no decide (el gate de autenticacion lo maneja
// <App /> con <Login />).
interface RutaGuardProps {
  rol?: string | null;
  vista: string;
  fallback?: ReactNode;
  children: ReactNode;
}

export default function RutaGuard({ rol, vista, fallback, children }: RutaGuardProps) {
  if (!rol) return fallback ?? null;
  if (!puedeAcceder(vista, rol)) return fallback ?? null;
  return <>{children}</>;
}
