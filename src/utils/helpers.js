// Toma solo las llaves permitidas que vengan definidas (evita mass-assignment)
function pick(obj = {}, keys = []) {
  return keys.reduce((acc, k) => {
    if (obj[k] !== undefined) acc[k] = obj[k];
    return acc;
  }, {});
}

function manejarError(res, err) {
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
