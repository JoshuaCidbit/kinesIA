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
const { sequelize, Usuario } = require('../src/models');
const { seedAlimentos } = require('../src/services/alimento.seed');
const { generarToken } = require('../src/middlewares/auth');

let server;
let base;
let AUTH_TOKEN;

before(async () => {
  await sequelize.sync({ force: true });
  await seedAlimentos();
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;

  // Crear usuario admin y generar token para las pruebas
  const admin = await Usuario.create({
    nombre: 'Admin Test',
    email: 'admin@test.com',
    rol: 'admin'
  });
  AUTH_TOKEN = generarToken(admin);
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await sequelize.close();
});

async function api(method, path, body, headers = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
      ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const texto = await res.text();
  let data;
  try { data = texto ? JSON.parse(texto) : null; } catch { data = texto; }
  return { status: res.status, data };
}

test('flujo API: catálogo → usuario → AG → historial → detalle → errores', async () => {
  // Health y catálogo
  const health = await api('GET', '/api/health');
  assert.equal(health.status, 200);
  assert.equal(health.data.db, 'conectada');

  const catalogo = await api('GET', '/api/alimentos');
  assert.equal(catalogo.status, 200);
  assert.ok(catalogo.data.length >= 40);
  assert.ok(catalogo.data.every((a) => a.id && a.nombre && a.calorias > 0));

  const filtro = await api('GET', '/api/alimentos?q=pollo');
  assert.equal(filtro.status, 200);
  assert.ok(filtro.data.length >= 1);
  assert.ok(filtro.data.every((a) => /pollo/i.test(a.nombre)));

  // Usuario (usando token de admin)
  const usuario = await api('POST', '/api/usuarios', {
    nombre: 'Paciente Integración',
    email: `integracion.${Date.now()}@kinesia.local`,
    edad: 30,
    password: 'Test1234!',
  });
  assert.equal(usuario.status, 201);
  assert.ok(usuario.data.id > 0);
  const usuarioId = usuario.data.id;

  // AG con ids del catálogo
  const ids = catalogo.data.slice(0, 12).map((a) => a.id);
  const plan = await api('POST', '/api/ag/calorico', {
    usuarioId,
    peso: 70,
    objetivo: 'cut',
    alimentoIds: ids,
    opciones: { seed: 42 },
  });
  assert.equal(plan.status, 201);
  assert.equal(plan.data.cumpleRestricciones, true);
  assert.equal(plan.data.mejorDistribucion.length, 5);
  assert.ok(Math.abs(plan.data.totalDiario - plan.data.caloriasObjetivo) <= 25);
  assert.equal(plan.data.rangoPorComida.length, 2);
  assert.ok(plan.data.id > 0);

  // Historial y detalle
  const historial = await api('GET', `/api/ag/usuario/${usuarioId}`);
  assert.equal(historial.status, 200);
  assert.equal(historial.data.length, 1);
  assert.equal(historial.data[0].id, plan.data.id);

  const detalle = await api('GET', `/api/ag/resultados/${plan.data.id}`);
  assert.equal(detalle.status, 200);
  assert.equal(detalle.data.mejorDistribucion.length, 5);
  assert.equal(detalle.data.cumpleRestricciones, true);

  // Compatibilidad con el body `alimentos` (sandbox)
  const sandbox = await api('POST', '/api/ag/calorico', {
    usuarioId,
    peso: 70,
    objetivo: 'cut',
    opciones: { seed: 9 },
    alimentos: catalogo.data.slice(0, 10).map((a) => ({ nombre: a.nombre, calorias: a.calorias })),
  });
  assert.equal(sandbox.status, 201);
  assert.equal(sandbox.data.cumpleRestricciones, true);

  // Errores de validación y recursos
  const ambos = await api('POST', '/api/ag/calorico', {
    usuarioId,
    peso: 70,
    objetivo: 'cut',
    alimentoIds: [ids[0]],
    alimentos: [{ nombre: 'X', calorias: 100 }],
  });
  assert.equal(ambos.status, 400);

  const sinAlimentos = await api('POST', '/api/ag/calorico', {
    usuarioId,
    peso: 70,
    objetivo: 'cut',
  });
  assert.equal(sinAlimentos.status, 400);

  const usuarioInexistente = await api('POST', '/api/ag/calorico', {
    usuarioId: 99999,
    peso: 70,
    objetivo: 'cut',
    alimentoIds: [ids[0]],
  });
  assert.equal(usuarioInexistente.status, 404);

  const alimentoInexistente = await api('POST', '/api/ag/calorico', {
    usuarioId,
    peso: 70,
    objetivo: 'cut',
    alimentoIds: [99999],
  });
  assert.equal(alimentoInexistente.status, 400);

  const lechuga = catalogo.data.find((a) => a.codigo === 'lechuga');
  const infactible = await api('POST', '/api/ag/calorico', {
    usuarioId,
    peso: 70,
    objetivo: 'cut',
    alimentoIds: [lechuga.id],
  });
  assert.equal(infactible.status, 422);

  assert.equal((await api('GET', '/api/ag/usuario/abc')).status, 400);
  assert.equal((await api('GET', '/api/ag/usuario/99999')).status, 404);
  assert.equal((await api('GET', '/api/ag/resultados/abc')).status, 400);
  assert.equal((await api('GET', '/api/ag/resultados/99999')).status, 404);

  // Borrar usuario debe borrar su historial (CASCADE)
  assert.equal((await api('DELETE', `/api/usuarios/${usuarioId}`)).status, 200);
});