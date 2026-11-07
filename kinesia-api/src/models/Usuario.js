const { urlArchivo } = require('../services/storage.service');

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// En el modo demo local (pg-mem) se usan STRING + validador; en produccion
// (PostgreSQL real / Azure) se mantiene el ENUM con su restriccion a nivel DB.
const enMemoria = process.env.USE_PG_MEM === 'true';

const Usuario = sequelize.define('Usuario', {
  nombre: { type: DataTypes.STRING, allowNull: false, validate: { notEmpty: { msg: 'El nombre es obligatorio' } } },
  email: {
    type: DataTypes.STRING, unique: true, allowNull: false,
    validate: { isEmail: { msg: 'El email no tiene un formato válido' } }
  },
  edad: { type: DataTypes.INTEGER, validate: { min: { args: [1], msg: 'Edad inválida' }, max: { args: [120], msg: 'Edad inválida' } } },
  fotoUrl: { type: DataTypes.STRING },   // URL pública en Azure Blob Storage
  fotoPath: { type: DataTypes.STRING },  // ruta interna en el bucket (para poder borrarla)
  rol: {
    type: enMemoria ? DataTypes.STRING(20) : DataTypes.ENUM('paciente', 'coach', 'admin'),
    allowNull: false,
    defaultValue: 'paciente',
    ...(enMemoria && {
      validate: {
        esRol(value) {
          if (!['paciente', 'coach', 'admin'].includes(value)) {
            throw new Error('Rol inválido: debe ser paciente, coach o admin');
          }
        },
      },
    }),
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
Usuario.prototype.toJSON = function () {
  const v = { ...this.get() };
  delete v.password_hash;
  if (v.fotoPath) v.fotoUrl = urlArchivo(v.fotoPath);
  return v;
};

module.exports = Usuario;