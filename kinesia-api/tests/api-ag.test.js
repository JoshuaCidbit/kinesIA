'use strict';
/**
 * Prueba de integración del flujo del AG contra la app Express real,
 * usando pg-mem para no necesitar PostgreSQL.
 *
 *   npm run test:api
 */
process.env.USE_PG_MEM = process.env.USE_PG_MEM || 'true';
process.env.DB_SSL = 'false';
process.env.CORS_ORIGIN = 'http://localhost:5173';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const app = require('../src/app');
const { sequelize } = require('../src/models');
const { seedAlimentos } = require('../src/services/alimento.seed');
const Usuario = require('../src/models/Usuario');

let server;
let base;

before(async () => {
  await sequelize.sync({ force: true });
  await seedAlimentos();
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;