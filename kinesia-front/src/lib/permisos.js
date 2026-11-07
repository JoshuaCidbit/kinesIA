// Reglas de eliminacion: quien puede eliminar a quien.
// El backend es la fuente de verdad (autorizacion); este helper solo decide si
// le mostramos el boton "Eliminar" en el frontend.

export function puedeEliminar({ actor, target }) {
  if (!actor || !target) return false;
  const aId = Number(actor.id);
  const tId = Number(target.id);
  if (actor.rol === 'admin') {
    // Admin puede eliminar a pacientes/coaches, pero no a otros admins ni a si mismo.
    return target.rol !== 'admin' && tId !== aId;
  }
  if (actor.rol === 'coach') {
    // Coach solo sobre sus propios pacientes (rol = 'paciente' con coachId = coach.id).
    return target.rol === 'paciente' && Number(target.coachId) === aId;
  }
  return false;
}
