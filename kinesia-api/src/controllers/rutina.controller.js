const { Rutina } = require('../models');
const { pick, manejarError } = require('../utils/helpers');
const { subirArchivo, eliminarArchivo } = require('../services/storage.service');

const CAMPOS = ['nombre', 'descripcion', 'anguloObjetivo'];

exports.crear = async (req, res) => {
  try {
    const rutina = await Rutina.create(pick(req.body, CAMPOS));
    res.status(201).json(rutina);
  } catch (err) { manejarError(res, err); }
};

exports.listar = async (req, res) => {
  try {
    res.json(await Rutina.findAll({ order: [['id', 'ASC']] }));
  } catch (err) { manejarError(res, err); }
};

exports.obtener = async (req, res) => {
  try {
    const rutina = await Rutina.findByPk(req.params.id);
    if (!rutina) return res.status(404).json({ error: 'Rutina no encontrada' });
    res.json(rutina);
  } catch (err) { manejarError(res, err); }
};

exports.actualizar = async (req, res) => {
  try {
    const rutina = await Rutina.findByPk(req.params.id);
    if (!rutina) return res.status(404).json({ error: 'Rutina no encontrada' });
    await rutina.update(pick(req.body, CAMPOS));
    res.json(rutina);
  } catch (err) { manejarError(res, err); }
};

exports.eliminar = async (req, res) => {
  try {
    const rutina = await Rutina.findByPk(req.params.id);
    if (!rutina) return res.status(404).json({ error: 'Rutina no encontrada' });
    const mediaPath = rutina.mediaPath;
    await rutina.destroy(); // falla con 409 si tiene sesiones asociadas (RESTRICT)
    await eliminarArchivo(mediaPath);
    res.json({ mensaje: 'Rutina eliminada correctamente' });
  } catch (err) { manejarError(res, err); }
};

// POST /api/rutinas/:id/media  (multipart/form-data, campo "media")
exports.subirMedia = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Envía un archivo en el campo "media"' });
    const rutina = await Rutina.findByPk(req.params.id);
    if (!rutina) return res.status(404).json({ error: 'Rutina no encontrada' });

    const anterior = rutina.mediaPath;
    const { path, url } = await subirArchivo(req.file, 'rutinas');
    await rutina.update({ mediaUrl: url, mediaPath: path });
    await eliminarArchivo(anterior);
    res.status(201).json(rutina);
  } catch (err) { manejarError(res, err); }
};
