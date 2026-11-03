const { Usuario } = require('../models');
const { pick, manejarError } = require('../utils/helpers');
const { subirArchivo, eliminarArchivo } = require('../services/storage.service');

const CAMPOS = ['nombre', 'email', 'edad'];

exports.crear = async (req, res) => {
  try {
    const usuario = await Usuario.create(pick(req.body, CAMPOS));
    res.status(201).json(usuario);
  } catch (err) { manejarError(res, err); }
};

exports.listar = async (req, res) => {
  try {
    res.json(await Usuario.findAll({ order: [['id', 'ASC']] }));
  } catch (err) { manejarError(res, err); }
};

exports.obtener = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(usuario);
  } catch (err) { manejarError(res, err); }
};

exports.actualizar = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    await usuario.update(pick(req.body, CAMPOS));
    res.json(usuario);
  } catch (err) { manejarError(res, err); }
};

exports.eliminar = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    const fotoPath = usuario.fotoPath;
    await usuario.destroy(); // sus sesiones se eliminan en cascada
    await eliminarArchivo(fotoPath);
    res.json({ mensaje: 'Usuario eliminado correctamente' });
  } catch (err) { manejarError(res, err); }
};

// POST /api/usuarios/:id/foto  (multipart/form-data, campo "foto")
exports.subirFoto = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Envía una imagen en el campo "foto"' });
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    const anterior = usuario.fotoPath;
    const { path, url } = await subirArchivo(req.file, 'usuarios');
    await usuario.update({ fotoUrl: url, fotoPath: path });
    await eliminarArchivo(anterior);
    res.status(201).json(usuario);
  } catch (err) { manejarError(res, err); }
};
