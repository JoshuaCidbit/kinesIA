require('dotenv').config();
const { Sequelize } = require('sequelize');
const pg = require('pg');

const usarMemoria = process.env.USE_PG_MEM === 'true';

// En modo local no hace falta configurar DATABASE_URL ni tocar Azure.
// Si USE_PG_MEM está activo se ignora cualquier DATABASE_URL real para no
// conectar por accidente a la base de Azure.
const databaseUrl = usarMemoria
  ? 'postgresql://local:local@localhost:5432/kinesia'
  : process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('Falta la variable de entorno DATABASE_URL');
}

// Azure Database for PostgreSQL exige SSL (DB_SSL=false solo para pruebas locales).
// DB_SSL_REJECT_UNAUTHORIZED (default true) controla si se valida el certificado raíz
// del servidor SSL; en Azure puede ser necesario false si la CA no está en el bundle.
const usarSSL = process.env.DB_SSL !== 'false';
const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false';
const dialectModule = usarMemoria ? require('./pg-mem') : pg;

const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  dialectModule,
  logging: false,
  dialectOptions: usarSSL ? { ssl: { require: true, rejectUnauthorized } } : {},
  pool: { max: 5, min: 0, idle: 10000, acquire: 30000 }
});

module.exports = sequelize;
