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
  fotoPath: { type: DataTypes.STRING },  // ruta interna en el bucket (para poder borrarla)
  rol: {
    type: DataTypes.ENUM('paciente', 'coach', 'admin'),
    allowNull: false,
    defaultValue: 'paciente'
  },
  coachId: { type: DataTypes.INTEGER, allowNull: true },   // solo aplica a pacientes
  password_hash: { type: DataTypes.STRING, allowNull: true }
}, {
  tableName: 'usuarios',
  // password_hash NUNCA se trae por defecto. Solo con Usuario.scope('conPassword')
  defaultScope: { attributes: { exclude: ['password_hash'] } },
  scopes: { conPassword: {} }
});

// Definir toJSON en el prototipo para agregar firma a fotoUrl cuando hay fotoPath
// Esto debe hacerse después del define(), ya que Sequelize tiene su propia lógica de toJSON
Usuario.prototype.toJSON = function() {
  const values = { ... this.dataValues };
  if (values.fotoPath && !values.fotoUrl.includes('sig')) {
    const crypto = require('crypto');
    const uuid = crypto.randomUUID();
    const timestamp = Date.now() + 3600 * 1000 * 24 * 365 * 10;
    const stringToSign = `${uuid}\n${timestamp}`;
    const firma = crypto.createHash('sha256').update(stringToSign).digest('base64');
    const signature = encodeURIComponent(firma).replace(/%%/g, '%25');
    values.fotoUrl = `${values.fotoUrl}?sig=${signature}`;
  }
  return values;
};