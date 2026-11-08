// Definicion de vistas disponibles por rol.
export const VISTAS_POR_ROL: Record<string, string[]> = {
  paciente: ['mi-panel'],
  coach: ['dashboard', 'pacientes', 'rutinas'],
  admin: ['dashboard', 'pacientes', 'rutinas'],
};

// Normaliza vistas de paciente (ej. 'paciente-12' -> 'pacientes').
function normalizar(vista: string | null | undefined): string | undefined {
  if (typeof vista !== 'string') return undefined;
  return vista.startsWith('paciente-') ? 'pacientes' : vista;
}

// El rol puede ver la vista solicitada?
export function puedeAcceder(vista: string | null | undefined, rol: string): boolean {
  const permitidas = VISTAS_POR_ROL[rol];
  if (!permitidas) return false;
  const v = normalizar(vista);
  return !!v && permitidas.includes(v);
}

// Devuelve la vista que debe renderizarse para el rol:
// si la vista no esta permitida, cae al home del rol (paciente -> mi-panel; staff -> dashboard).
export function resolverVista(vista: string | null | undefined, rol: string): string {
  const v = normalizar(vista);
  const permitidas = VISTAS_POR_ROL[rol] || [];
  if (v && permitidas.includes(v)) return v;
  return rol === 'paciente' ? 'mi-panel' : 'dashboard';
}
