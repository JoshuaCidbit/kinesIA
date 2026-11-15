'use strict';
/**
 * Pruebas del proxy de estadísticas (/api/estadisticas/:usuarioId).
 *
 * Verifica que las estadísticas (dato de salud) solo sean accesibles por
 * admin, el coach del paciente o el propio paciente. El proxy se prueba sin
 * FUNCTIONS_URL, de modo que un acceso autorizado responde 500 (config),
 * lo que demuestra que pasó la capa de autenticación/autorización.
 */
process.env.USE_PG_MEM = process.env.USE_PG_MEM || 'true';
process.env.DB_SSL = 'false';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-de-prueba-0123456789';
delete process.env.FUNCTIONS_URL;

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const app = require('../src/app');
const { sequelize, Usuario } = require('../src/models');
const { generarToken } = require('../src/middlewares/auth');

let server;
let base;
let tokenAdmin;
let tokenCoach;
let tokenPaciente;
let tokenOtroPaciente;
let pacienteId;
let otroPacienteId;

before(async () => {
  await sequelize.sync({ force: true });
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;

  const admin = await Usuario.create({
    nombre: 'Admin Stats',
    email: 'admin.stats@test.com',
    rol: 'admin',
  });
  tokenAdmin = generarToken(admin);

  const coach = await Usuario.create({
    nombre: 'Coach Stats',
    email: 'coach.stats@test.com',
    rol: 'coach',
  });
  tokenCoach = generarToken(coach);

  // Paciente asignado al coach: el coach sí puede ver sus estadísticas.
  const paciente = await Usuario.create({
    nombre: 'Paciente Stats',
    email: 'paciente.stats@test.com',
    rol: 'paciente',
    coachId: coach.id,
  });
  pacienteId = paciente.id;
  tokenPaciente = generarToken(paciente);

  // Paciente sin coach: nadie salvo admin o él mismo puede verlo.
  const otro = await Usuario.create({
    nombre: 'Otro Paciente Stats',
    email: 'otro.stats@test.com',
    rol: 'paciente',
  });
  otroPacienteId = otro.id;
  tokenOtroPaciente = generarToken(otro);
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await sequelize.close();
});

async function api(path, token) {
  const res = await fetch(base + path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const texto = await res.text();
  let data;
  try { data = texto ? JSON.parse(texto) : null; } catch { data = texto; }
  return { status: res.status, data };
}

test('estadisticas: sin token responde 401', async () => {
  const res = await api(`/api/estadisticas/${pacienteId}`);
  assert.equal(res.status, 401);
});

test('estadisticas: token invalido responde 401', async () => {
  const res = await api(`/api/estadisticas/${pacienteId}`, 'token-invalido');
  assert.equal(res.status, 401);
});

test('estadisticas: un paciente no puede ver las de otro paciente (403)', async () => {
  const res = await api(`/api/estadisticas/${otroPacienteId}`, tokenPaciente);
  assert.equal(res.status, 403);
});

test('estadisticas: un coach no puede ver las de un paciente no asignado (403)', async () => {
  const res = await api(`/api/estadisticas/${otroPacienteId}`, tokenCoach);
  assert.equal(res.status, 403);
});

test('estadisticas: id no numerico responde 400', async () => {
  const res = await api('/api/estadisticas/abc', tokenPaciente);
  assert.equal(res.status, 400);
});

test('estadisticas: el admin puede consultar (llega al proxy: 500 sin FUNCTIONS_URL)', async () => {
  const res = await api(`/api/estadisticas/${pacienteId}`, tokenAdmin);
  assert.equal(res.status, 500);
  assert.match(String(res.data?.error), /FUNCTIONS_URL/);
});

test('estadisticas: el paciente puede consultar las suyas (llega al proxy)', async () => {
  const res = await api(`/api/estadisticas/${pacienteId}`, tokenPaciente);
  assert.equal(res.status, 500);
});

test('estadisticas: el coach asignado puede consultarlas (llega al proxy)', async () => {
  const res = await api(`/api/estadisticas/${pacienteId}`, tokenCoach);
  assert.equal(res.status, 500);
});

test('estadisticas: token de otro paciente no sirve para el propio endpoint ajeno', async () => {
  const res = await api(`/api/estadisticas/${pacienteId}`, tokenOtroPaciente);
  assert.equal(res.status, 403);
});
