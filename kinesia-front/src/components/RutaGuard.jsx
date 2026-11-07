import { puedeAcceder } from '../lib/rutas';

// Guard de rol: renderiza los hijos solo si el rol autenticado puede ver la
// vista. Sin usuario autenticado no decide (el gate de autenticacion lo maneja
// <App /> con <Login />).
export default function RutaGuard({ rol, vista, fallback, children }) {
  if (!rol) return fallback ?? null;
  if (!puedeAcceder(vista, rol)) return fallback ?? null;
  return children;
}
