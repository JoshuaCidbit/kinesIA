'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Nota: objetivo como STRING + isIn (no ENUM): con sync({ alter: true }) en
// PostgreSQL los ENUM de Sequelize dan problemas al alterar la tabla.
// JSONB (no JSON) para coincidir con el SQL del plan y poder indexar.
module.exports = sequelize.define('AgResultado', {
  usuarioId: { type: DataTypes.INTEGER, allowNull: false },
  objetivo: {
    type: DataTypes.STRING(10),
    allowNull: false,
    validate: { isIn: [['cut', 'bulk']] },
  },
  peso: { type: DataTypes.FLOAT, allowNull: false, validate: { min: 20, max: 300 } },
  altura: { type: DataTypes.FLOAT, allowNull: true, validate: { min: 50, max: 250 } },
  caloriasObjetivo: { type: DataTypes.FLOAT, allowNull: false },
  totalDiario: { type: DataTypes.FLOAT },
  fitness: { type: DataTypes.FLOAT },
  violacion: { type: DataTypes.FLOAT },
  generaciones: { type: DataTypes.INTEGER },
  cumpleRestricciones: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  // 5 comidas con alimentos, porciones y calorías
  distribucionJson: { type: DataTypes.JSONB, allowNull: false },
  // { opciones, rangoPorComida, historial, alimentoIds } → reproducibilidad y detalle
  opcionesJson: { type: DataTypes.JSONB },
}, {
  tableName: 'ag_resultados',
  timestamps: true,
});
