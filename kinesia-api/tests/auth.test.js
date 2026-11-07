'use strict';
/**
 * Pruebas de autorizacion de la API (401 / 403) contra la app Express real,
 * usando pg-mem para no necesitar PostgreSQL.
 *
 *   npm test
 *
 * Cubre:
 *   - 401: rutas protegidas sin token.
 *   - 403: rol insuficiente (paciente intentando operar como coach/admin).
 *   - 403: paciente intentando leer datos de otro paciente.
 */
process.env.USE_PG_MEM = process.env.USE_PG_MEM || 'true';
process.env.DB_SSL = 'false';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-de-prueba-0123456789';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const app = require('../src/app');
const { sequelize, Usuario } = require('../src/models');
const { generarToken } = require('../src/middlewares/auth');

let server;
let base;
let tokenAdmin;
let tokenPaciente;
let tokenCoach;
let pacienteId;
let otroPacienteId;

before(async () => {
  await sequelize.sync({ force: true });
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;

  const admin = await Usuario.create({
    nombre: 'Admin Auth',
    email: 'admin.auth@test.com',
    rol: 'admin',
  });
  tokenAdmin = generarToken(admin);

  const paciente = await Usuario.create({
    nombre: 'Paciente Auth',
    email: 'paciente.auth@test.com',
    rol: 'paciente',
  });
  pacienteId = paciente.id;
  tokenPaciente = generarToken(paciente);

  const coach = await Usuario.create({
    nombre: 'Coach Auth',
    email: 'coach.auth@test.com',
    rol: 'coach',
  });
  tokenCoach = generarToken(coach);

  // Otro paciente: sera la victima de los intentos de acceso no autorizado.
  const otro = await Usuario.create({
    nombre: 'Paciente Otro',
    email: 'otro.paciente.auth@test.com',
    rol: 'paciente',
  });
  otroPacienteId = otro.id;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await sequelize.close();
});

async function api(method, path, body, token) {
  const res = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const texto = await res.text();
  let data;
  try { data = texto ? JSON.parse(texto) : null; } catch { data = texto; }
  return { status: res.status, data };
}

test('auth: rutas protegidas responden 401 sin token', async () => {
  const sinToken = [
    ['GET', '/api/usuarios'],
    ['GET', '/api/rutinas'],
    ['GET', '/api/alimentos'],
    ['GET', '/api/sesiones'],
    ['GET', '/api/ag/calorico'],
    ['POST', '/api/usuarios'],
  ];

  for (const [method, path] of sinToken) {
    const res = await api(method, path, method === 'POST' ? { nombre: 'X' } : undefined);
    assert.equal(res.status, 401, `${method} ${path} sin token debe dar 401 (dio ${res.status})`);
  }
});

test('auth: el login es publico pero rechaza credenciales invalidas', async () => {
  const res = await api('POST', '/api/usuarios/login', { email: 'paciente.auth@test.com', password: 'incorrecta123' });
  assert.equal(res.status, 401);
});

test('auth: con token valido el admin puede acceder (control)', async () => {
  const res = await api('GET', '/api/usuarios', undefined, tokenAdmin);
  assert.equal(res.status, 200);
});

test('auth: rol insuficiente devuelve 403', async () => {
  // Paciente intentando crear usuarios (solo coach/admin).
  const crearComoPaciente = await api('POST', '/api/usuarios', { nombre: 'Hacker', email: 'hacker@test.com', password: 'Test1234!' }, tokenPaciente);
  assert.equal(crearComoPaciente.status, 403);

  // Paciente intentando modificar una rutina (solo coach/admin).
  const rutina = await api('GET', '/api/rutinas', undefined, tokenAdmin);
  const rutinaId = Array.isArray(rutina.data) ? rutina.data[0]?.id : null;
  const editarComoPaciente = await api('PUT', `/api/rutinas/${rutinaId ?? 1}`, { nombre: 'Hackeada' }, tokenPaciente);
  assert.equal(editarComoPaciente.status, 403);

  // Coach intentando listar coaches (solo admin).
  const coachesComoCoach = await api('GET', '/api/usuarios/coaches', undefined, tokenCoach);
  assert.equal(coachesComoCoach.status, 403);
});

test('auth: paciente no puede leer datos de otro paciente', async () => {
  // El paciente solo puede ver su propio registro.
  const propio = await api('GET', `/api/usuarios/${pacienteId}`, undefined, tokenPaciente);
  assert.equal(propio.status, 200);

  // ... pero no el de otro paciente.
  const ajeno = await api('GET', `/api/usuarios/${otroPacienteId}`, undefined, tokenPaciente);
  assert.equal(ajeno.status, 403);

  // Tampoco puede ver el historial de sesiones de otro paciente.
  const historialAjeno = await api('GET', `/api/sesiones/usuario/${otroPacienteId}`, undefined, tokenPaciente);
  assert.equal(historialAjeno.status, 403);

  // Tampoco el historial del AG de otro paciente.
  const agAjeno = await api('GET', `/api/ag/usuario/${otroPacienteId}`, undefined, tokenPaciente);
  assert.equal(agAjeno.status, 403);
});
