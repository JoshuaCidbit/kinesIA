// Definicion de vistas disponibles por rol.
export const VISTAS_POR_ROL = {
  paciente: ['mi-panel'],
  coach: ['dashboard', 'pacientes', 'rutinas'],
  admin: ['dashboard', 'pacientes', 'rutinas'],
};

// Normaliza vistas de paciente (ej. 'paciente-12' -> 'pacientes').
function normalizar(vista) {
  return typeof vista === 'string' && vista.startsWith('paciente-') ? 'pacientes' : vista;
}

// El rol puede ver la vista solicitada?
export function puedeAcceder(vista, rol) {
  const permitidas = VISTAS_POR_ROL[rol];
  if (!permitidas) return false;
  return permitidas.includes(normalizar(vista));
}

// Devuelve la vista que debe renderizarse para el rol:
// si la vista no esta permitida, cae al home del rol.
export function resolverVista(vista, rol) {
  const v = normalizar(vista);
  const permitidas = VISTAS_POR_ROL[rol] || [];
  if (permitidas.includes(v)) return v;
  return rol === 'paciente' ? 'mi-panel' : 'dashboard';
}
