const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

module.exports = sequelize.define('SesionTerapia', {
  fecha: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  repeticiones: { type: DataTypes.INTEGER, validate: { min: 0 } },
  precisionPromedio: {
    type: DataTypes.FLOAT,
    validate: { min: { args: [0], msg: 'La precisión debe estar entre 0 y 100' }, max: { args: [100], msg: 'La precisión debe estar entre 0 y 100' } }
  },
  observaciones: { type: DataTypes.TEXT }
}, { tableName: 'sesiones_terapia' });
