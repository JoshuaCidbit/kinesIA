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
