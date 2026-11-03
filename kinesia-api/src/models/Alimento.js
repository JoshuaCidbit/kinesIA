'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Catálogo de alimentos. `calorias` y los macros corresponden a `porcionBase`
// (por ejemplo: 165 kcal por 100 g, o 120 kcal por 1 cucharada).
module.exports = sequelize.define('Alimento', {
  codigo: {
    type: DataTypes.STRING(120),
    allowNull: false,
    unique: true,
  },
  nombre: {
    type: DataTypes.STRING(120),
    allowNull: false,
  },
  categoria: {
    type: DataTypes.STRING(60),
    allowNull: true,
  },
  calorias: {
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: { min: 1 },
  },
  porcionBase: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 100,
  },
  unidad: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'g',
  },
  proteinas: { type: DataTypes.FLOAT, allowNull: true },
  carbohidratos: { type: DataTypes.FLOAT, allowNull: true },
  grasas: { type: DataTypes.FLOAT, allowNull: true },
  activo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
}, {
  tableName: 'alimentos',
  timestamps: true,
});
