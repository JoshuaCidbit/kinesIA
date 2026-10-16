const { Usuario, Rutina, SesionTerapia } = require('../models');
const { pick, manejarError } = require('../utils/helpers');

const esEntero = v => Number.isInteger(Number(v)) && Number(v) > 0;
const INCLUIR = [
  { model: Usuario, attributes: ['id', 'nombre', 'email'] },
  { model: Rutina, attributes: ['id', 'nombre', 'anguloObjetivo'] }
];

exports.crear = async (req, res) => {
  try {
    const { usuarioId, rutinaId } = req.body;
    if (!esEntero(usuarioId) || !esEntero(rutinaId)) {
      return res.status(400).json({ error: 'usuarioId y rutinaId son obligatorios y deben ser enteros' });
    }
    const [usuario, rutina] = await Promise.all([Usuario.findByPk(usuarioId), Rutina.findByPk(rutinaId)]);
    if (!usuario) return res.status(404).json({ error: 'El usuario indicado no existe' });
    if (!rutina) return res.status(404).json({ error: 'La rutina indicada no existe' });

    const sesion = await SesionTerapia.create(
      pick(req.body, ['usuarioId', 'rutinaId', 'fecha', 'repeticiones', 'precisionPromedio', 'observaciones'])
    );
    res.status(201).json(sesion);
  } catch (err) { manejarError(res, err); }
};

exports.listar = async (req, res) => {
  try {
    res.json(await SesionTerapia.findAll({ include: INCLUIR, order: [['fecha', 'DESC']] }));
  } catch (err) { manejarError(res, err); }
};

exports.obtener = async (req, res) => {
  try {
    const sesion = await SesionTerapia.findByPk(req.params.id, { include: INCLUIR });
    if (!sesion) return res.status(404).json({ error: 'Sesión no encontrada' });
    res.json(sesion);
  } catch (err) { manejarError(res, err); }
};

// GET /api/sesiones/usuario/:usuarioId  (historial con JOIN a Usuario y Rutina)
exports.listarPorUsuario = async (req, res) => {
  try {
    const sesiones = await SesionTerapia.findAll({
      where: { usuarioId: req.params.usuarioId },
      include: INCLUIR,
      order: [['fecha', 'DESC']]
    });
    res.json(sesiones);
  } catch (err) { manejarError(res, err); }
};

exports.actualizar = async (req, res) => {
  try {
    const sesion = await SesionTerapia.findByPk(req.params.id);
    if (!sesion) return res.status(404).json({ error: 'Sesión no encontrada' });
    await sesion.update(pick(req.body, ['fecha', 'repeticiones', 'precisionPromedio', 'observaciones']));
    res.json(sesion);
  } catch (err) { manejarError(res, err); }
};

exports.eliminar = async (req, res) => {
  try {
    const sesion = await SesionTerapia.findByPk(req.params.id);
    if (!sesion) return res.status(404).json({ error: 'Sesión no encontrada' });
    await sesion.destroy();
    res.json({ mensaje: 'Sesión eliminada correctamente' });
  } catch (err) { manejarError(res, err); }
};
