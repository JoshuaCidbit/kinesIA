require('dotenv').config();
const { Sequelize } = require('sequelize');
const pg = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error('Falta la variable de entorno DATABASE_URL');
}

// Azure Database for PostgreSQL exige SSL (DB_SSL=false solo para pruebas locales)
const usarSSL = process.env.DB_SSL !== 'false';

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectModule: pg,
  logging: false,
  dialectOptions: usarSSL ? { ssl: { require: true, rejectUnauthorized: false } } : {},
  pool: { max: 5, min: 0, idle: 10000, acquire: 30000 }
});

module.exports = sequelize;
