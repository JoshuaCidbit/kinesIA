'use strict';
/**
 * Arranque 100 % local de KinesIA (sin Azure y sin instalar PostgreSQL).
 *
 *   npm run start:local
 *
 * Usa PostgreSQL en memoria (pg-mem), crea las tablas desde cero y carga el
 * catálogo de data/alimentos.json en cada arranque. Los datos se pierden al
 * detener el proceso: es una demo, no un entorno persistente.
 *
 * Para usar PostgreSQL real basta con arrancar `npm start` y definir
 * DATABASE_URL (y DB_SYNC=true la primera vez).
 */
process.env.USE_PG_MEM = 'true';
process.env.DB_SSL = 'false';
process.env.DB_SYNC = 'true';
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
process.env.PORT = process.env.PORT || '3000';

require('../src/index');
