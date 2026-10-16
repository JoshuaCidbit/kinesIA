const sequelize = require('../config/database');
const Usuario = require('./Usuario');
const Rutina = require('./Rutina');
const SesionTerapia = require('./SesionTerapia');

// Relaciones 1:N
// Si se borra un usuario se borra su historial; una rutina con sesiones NO se puede borrar (RESTRICT)
Usuario.hasMany(SesionTerapia, { foreignKey: { name: 'usuarioId', allowNull: false }, onDelete: 'CASCADE' });
SesionTerapia.belongsTo(Usuario, { foreignKey: { name: 'usuarioId', allowNull: false } });

Rutina.hasMany(SesionTerapia, { foreignKey: { name: 'rutinaId', allowNull: false }, onDelete: 'RESTRICT' });
SesionTerapia.belongsTo(Rutina, { foreignKey: { name: 'rutinaId', allowNull: false } });

module.exports = { sequelize, Usuario, Rutina, SesionTerapia };
