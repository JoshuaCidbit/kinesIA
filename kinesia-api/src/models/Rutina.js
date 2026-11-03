const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

module.exports = sequelize.define('Rutina', {
  nombre: { type: DataTypes.STRING, allowNull: false, validate: { notEmpty: { msg: 'El nombre es obligatorio' } } },
  descripcion: { type: DataTypes.TEXT },
  anguloObjetivo: { type: DataTypes.FLOAT, validate: { min: 0, max: 360 } },
  mediaUrl: { type: DataTypes.STRING },  // imagen o video demostrativo
  mediaPath: { type: DataTypes.STRING }
}, { tableName: 'rutinas' });
