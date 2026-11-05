'use strict';
const { Op } = require('sequelize');
const { Alimento } = require('../models');
const { manejarError } = require('../utils/helpers');

// GET /api/alimentos?q=pollo&categoria=Proteína
exports.listar = async (req, res) => {
  try {
    const where = { activo: true };
    const q = String(req.query.q || '').trim();
    const categoria = String(req.query.categoria || '').trim();

    if (q) where.nombre = { [Op.iLike]: `%${q}%` };
    if (categoria) where.categoria = categoria;

    const filas = await Alimento.findAll({
      where,
      attributes: [
        'id', 'codigo', 'nombre', 'categoria', 'calorias',
        'porcionBase', 'unidad', 'proteinas', 'carbohidratos', 'grasas',
      ],
      order: [['nombre', 'ASC']],
    });

    res.json(filas);
  } catch (err) {
    manejarError(res, err);
  }
};

// POST /api/alimentos - coach y admin (con protección de usuarioId)
exports.crear = async (req, res) => {
  try {
    const { nombre, categoria, calorias, porcionBase, unidad } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });
    
    const nuevoAlimento = await Alimento.create({
      nombre,
      categoria: categoria || 'general',
      calorias: calorias || 0,
      porcionBase: porcionBase || 1,
      unidad: unidad || 'unidad',
      activo: true,
    });
    res.json(nuevoAlimento);
  } catch (err) {
    manejarError(res, err);
  }
};

// PUT /api/alimentos/:id - coach y admin
exports.actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, categoria, calorias, porcionBase, unidad } = req.body;
    
    const alimento = await Alimento.findByPk(id);
    if (!alimento) return res.status(404).json({ error: 'Alimento no encontrado' });
    
    await alimento.update({
      nombre: nombre || alimento.nombre,
      categoria: categoria || alimento.categoria,
      calorias: calorias !== undefined ? calorias : alimento.calorias,
      porcionBase: porcionBase !== undefined ? porcionBase : alimento.porcionBase,
      unidad: unidad || alimento.unidad,
    });
    res.json(alimento);
  } catch (err) {
    manejarError(res, err);
  }
};

// DELETE /api/alimentos/:id - coach y admin
exports.eliminar = async (req, res) => {
  try {
    const { id } = req.params;
    
    const alimento = await Alimento.findByPk(id);
    if (!alimento) return res.status(404).json({ error: 'Alimento no encontrado' });
    
    await alimento.update({ activo: false });
    res.json({ mensaje: 'Alimento desactivado' });
  } catch (err) {
    manejarError(res, err);
  }
};
