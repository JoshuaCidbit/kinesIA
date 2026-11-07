const sequelize = require('../config/database');
const Usuario = require('./Usuario');
const Rutina = require('./Rutina');
const SesionTerapia = require('./SesionTerapia');
const AgResultado = require('./AgResultado');
const Alimento = require('./Alimento');

// Relaciones 1:N
// Si se borra un usuario se borra su historial; una rutina con sesiones NO se puede borrar (RESTRICT)
Usuario.hasMany(SesionTerapia, { foreignKey: { name: 'usuarioId', allowNull: false }, onDelete: 'CASCADE' });
SesionTerapia.belongsTo(Usuario, { foreignKey: { name: 'usuarioId', allowNull: false } });

Rutina.hasMany(SesionTerapia, { foreignKey: { name: 'rutinaId', allowNull: false }, onDelete: 'RESTRICT' });
SesionTerapia.belongsTo(Rutina, { foreignKey: { name: 'rutinaId', allowNull: false } });

// Historial del AG: si se borra el paciente, se borra su historial.
Usuario.hasMany(AgResultado, { foreignKey: { name: 'usuarioId', allowNull: false }, onDelete: 'CASCADE' });
AgResultado.belongsTo(Usuario, { foreignKey: { name: 'usuarioId', allowNull: false } });

// Relaciones coach ↔ pacientes.
// Nota: el self-referencing FK (usuarios.coachId → usuarios.id) no lo soporta
// pg-mem (PostgreSQL en memoria de la demo local), así que solo se registra en
// bases reales (PostgreSQL local o Azure). En modo demo se filtra por coachId
// directamente en las consultas.
const enMemoria = process.env.USE_PG_MEM === 'true';
if (!enMemoria) {
  Usuario.hasMany(Usuario, { as: 'pacientes', foreignKey: 'coachId', onDelete: 'SET NULL' });
  Usuario.belongsTo(Usuario, { as: 'coach', foreignKey: 'coachId' });
}

module.exports = { sequelize, Usuario, Rutina, SesionTerapia, AgResultado, Alimento };
