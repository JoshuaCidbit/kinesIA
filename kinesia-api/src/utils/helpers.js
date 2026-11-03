// Toma solo las llaves permitidas que vengan definidas (evita mass-assignment)
function pick(obj = {}, keys = []) {
  return keys.reduce((acc, k) => {
    if (obj[k] !== undefined) acc[k] = obj[k];
    return acc;
  }, {});
}

function manejarError(res, err) {
  // PostgreSQL: 23503 = foreign_key_violation, 23001 = restrict_violation.
  // pg-mem (demo local) no expone el código, pero sí el mensaje: se detecta
  // también por texto para que el 409 sea igual en local y en Azure.
  const pgCode = err.parent?.code || err.original?.code;
  const pgMensaje = String(err.parent?.message || err.original?.message || err.message || '');
  if (
    pgCode === '23503' || pgCode === '23001' ||
    /violates foreign key constraint|foreign key constraint/i.test(pgMensaje)
  ) {
    return res.status(409).json({
      error: 'No se puede completar: existen registros relacionados (ej. la rutina tiene sesiones)'
    });
  }

  switch (err.name) {
    case 'SequelizeValidationError':
      return res.status(400).json({ error: err.errors.map(e => e.message) });
    case 'SequelizeUniqueConstraintError':
      return res.status(409).json({ error: 'Ya existe un registro con ese valor único (ej. email)' });
    case 'SequelizeForeignKeyConstraintError':
      return res.status(409).json({ error: 'No se puede completar: existen registros relacionados (ej. la rutina tiene sesiones)' });
    case 'ArchivoInvalido':
    case 'MulterError':
      return res.status(400).json({ error: err.message });
    default:
      console.error(err);
      return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

module.exports = { pick, manejarError };