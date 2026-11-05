const { puedeVer } = require('../middlewares/auth');
const { esEntero } = require('../ag/validacion');
const { pick, manejarError } = require('../utils/helpers');
const { Usuario, Rutina, SesionTerapia } = require('../models');

// INCLUIR: asociaciones por defecto para las queries de sesiones
const INCLUIR = [
  { model: Usuario, attributes: ['id', 'nombre', 'email', 'rol', 'fotoUrl'] },
  { model: Rutina, attributes: ['id', 'nombre', 'descripcion', 'duracion', 'calorias'] }
];

exports.crear = async (req, res) => {
  try {
    // Un paciente solo registra sesiones para sí mismo (si omite usuarioId, se usa el suyo)
    const usuarioId = req.body.usuarioId ?? (req.usuario.rol === 'paciente' ? req.usuario.id : undefined);
    const { rutinaId } = req.body;
    if (!esEntero(usuarioId) || !esEntero(rutinaId)) {
      return res.status(400).json({ error: 'usuarioId y rutinaId son obligatorios y deben ser enteros' });
    }
    if (!(await puedeVer(req.usuario, usuarioId))) {
      return res.status(403).json({ error: 'No tienes permisos sobre este paciente' });
    }
    const [usuario, rutina] = await Promise.all([Usuario.findByPk(usuarioId), Rutina.findByPk(rutinaId)]);
    if (!usuario) return res.status(404).json({ error: 'El usuario indicado no existe' });
    if (!rutina) return res.status(404).json({ error: 'La rutina indicada no existe' });

    const sesion = await SesionTerapia.create({
      ...pick(req.body, ['rutinaId', 'fecha', 'repeticiones', 'precisionPromedio', 'observaciones']),
      usuarioId: Number(usuarioId)
    });
    res.status(201).json(sesion);
  } catch (err) { manejarError(res, err); }
};

exports.listarPorUsuario = async (req, res) => {
  try {
    const { rol, id } = req.usuario;
    const where = {};
    const include = INCLUIR.map(i => ({ ...i }));
    if (rol === 'paciente') where.usuarioId = id;
    if (rol === 'coach') include[0] = { ...include[0], where: { coachId: id }, required: true };
    res.json(await SesionTerapia.findAll({ where, include, order: [['fecha', 'DESC']] }));
  } catch (err) { manejarError(res, err); }
};

exports.listar = async (req, res) => {
  try {
    const { rol, id } = req.usuario;
    const where = {};
    const include = INCLUIR.map(i => ({ ...i }));
    if (rol === 'paciente') where.usuarioId = id;
    if (rol === 'coach') include[0] = { ...include[0], where: { coachId: id }, required: true };
    res.json(await SesionTerapia.findAll({ where, include, order: [['fecha', 'DESC']] }));
  } catch (err) { manejarError(res, err); }
};

exports.obtener = async (req, res) => {
  try {
    const sesion = await SesionTerapia.findByPk(req.params.id, { include: INCLUIR });
    if (!sesion) return res.status(404).json({ error: 'Sesión no encontrada' });
    if (!(await puedeVer(req.usuario, sesion.usuarioId))) {
      return res.status(403).json({ error: 'No tienes permisos sobre esta sesión' });
    }
    res.json(sesion);
  } catch (err) { manejarError(res, err); }
};

exports.actualizar = async (req, res) => {
  try {
    const sesion = await SesionTerapia.findByPk(req.params.id);
    if (!sesion) return res.status(404).json({ error: 'Sesión no encontrada' });
    if (!(await puedeVer(req.usuario, sesion.usuarioId))) {
      return res.status(403).json({ error: 'No tienes permisos sobre esta sesión' });
    }
    const { repeticiones, precisionPromedio, observaciones } = req.body;
    await sesion.update({ repeticiones, precisionPromedio, observaciones });
    res.json(sesion);
  } catch (err) { manejarError(res, err); }
};

exports.eliminar = async (req, res) => {
  try {
    const sesion = await SesionTerapia.findByPk(req.params.id);
    if (!sesion) return res.status(404).json({ error: 'Sesión no encontrada' });
    if (!(await puedeVer(req.usuario, sesion.usuarioId))) {
      return res.status(403).json({ error: 'No tienes permisos sobre esta sesión' });
    }
    await sesion.destroy();
    res.json({ mensaje: 'Sesión eliminada correctamente' });
  } catch (err) { manejarError(res, err); }
};

module.exports = exports;