const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

module.exports = sequelize.define('Usuario', {
  nombre: { type: DataTypes.STRING, allowNull: false, validate: { notEmpty: { msg: 'El nombre es obligatorio' } } },
  email: {
    type: DataTypes.STRING, unique: true, allowNull: false,
    validate: { isEmail: { msg: 'El email no tiene un formato válido' } }
  },
  edad: { type: DataTypes.INTEGER, validate: { min: { args: [1], msg: 'Edad inválida' }, max: { args: [120], msg: 'Edad inválida' } } },
  fotoUrl: { type: DataTypes.STRING },   // URL pública en Supabase Storage
  fotoPath: { type: DataTypes.STRING }   // ruta interna en el bucket (para poder borrarla)
}, { tableName: 'usuarios' });
