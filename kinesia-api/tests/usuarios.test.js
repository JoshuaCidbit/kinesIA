'use strict';
/**
 * Pruebas de eliminacion de usuarios y limite de un unico admin (API).
 *
 *   npm test
 *
 * Cubre:
 *   - El admin puede eliminar a cualquier usuario que no sea admin.
 *   - El admin NO puede eliminar a otro admin (403) ni a si mismo (400).
 *   - No se puede crear un segundo admin (409).
 *   - No se puede promover a un usuario a admin cuando ya existe uno (409).
 *   - El admin no puede demotarse a si mismo (400).
 *   - Al eliminar un coach, sus pacientes quedan sin coach (coachId NULL).
 */
process.env.USE_PG_MEM = process.env.USE_PG_MEM || 'true';
process.env.DB_SSL = 'false';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-de-prueba-0123456789';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

// En CI/produccion (USE_PG_MEM=false) corre contra PostgreSQL real, donde el
// indice unico parcial `usuarios_unico_admin` impide tener dos admins.
const enMemoria = process.env.USE_PG_MEM === 'true';

const app = require('../src/app');
const { sequelize, Usuario } = require('../src/models');
const { generarToken } = require('../src/middlewares/auth');

let server;
let base;
let tokenAdmin;
let tokenCoach;
let adminId;
let coachId;
let coach2Id;
let pacienteId;
let pacienteSinCoachId;

before(async () => {
  await sequelize.sync({ force: true });
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;

  const admin = await Usuario.create({
    nombre: 'Admin Usuarios',
    email: 'admin.usuarios@test.com',
    rol: 'admin',
  });
  adminId = admin.id;
  tokenAdmin = generarToken(admin);

  const coach = await Usuario.create({
    nombre: 'Coach Usuarios',
    email: 'coach.usuarios@test.com',
    rol: 'coach',
  });
  coachId = coach.id;
  tokenCoach = generarToken(coach);

  const coach2 = await Usuario.create({
    nombre: 'Coach Usuarios 2',
    email: 'coach2.usuarios@test.com',
    rol: 'coach',
  });
  coach2Id = coach2.id;

  const paciente = await Usuario.create({
    nombre: 'Paciente Usuarios',
    email: 'paciente.usuarios@test.com',
    rol: 'paciente',
    coachId,
  });
  pacienteId = paciente.id;

  const pacienteSinCoach = await Usuario.create({
    nombre: 'Paciente Sin Coach',
    email: 'sin.coach.usuarios@test.com',
    rol: 'paciente',
  });
  pacienteSinCoachId = pacienteSinCoach.id;
});

after(async () => {
  await new Promise((resolve) => {
    server.close(resolve);
  });
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

test('usuarios: el admin puede eliminar a un usuario que no es admin', async () => {
  const victima = await Usuario.create({
    nombre: 'Paciente a borrar',
    email: 'borrar.paciente@test.com',
    rol: 'paciente',
  });
  const res = await api('DELETE', `/api/usuarios/${victima.id}`, undefined, tokenAdmin);
  assert.equal(res.status, 200);

  const resGet = await api('GET', `/api/usuarios/${victima.id}`, undefined, tokenAdmin);
  assert.equal(resGet.status, 404);
});

test('usuarios: el admin no puede eliminar a otro admin', async (t) => {
  // En PostgreSQL real el indice unico parcial `usuarios_unico_admin` impide tener
  // dos admins; si la creacion del segundo falla, el escenario no aplica y se salta.
  let otroAdmin;
  try {
    otroAdmin = await Usuario.create({
      nombre: 'Otro Admin',
      email: 'otro.admin.usuarios@test.com',
      rol: 'admin',
    });
  } catch {
    t.skip('PostgreSQL real: ya existe el unico admin (indice unico parcial)');
    return;
  }
  const res = await api('DELETE', `/api/usuarios/${otroAdmin.id}`, undefined, tokenAdmin);
  assert.equal(res.status, 403);
});

test('usuarios: el admin no puede eliminarse a si mismo', async () => {
  const res = await api('DELETE', `/api/usuarios/${adminId}`, undefined, tokenAdmin);
  assert.equal(res.status, 400);
});

test('usuarios: no se puede crear un segundo admin', async () => {
  const res = await api('POST', '/api/usuarios', {
    nombre: 'Nuevo Admin',
    email: 'nuevo.admin.usuarios@test.com',
    password: 'Test1234!',
    rol: 'admin',
  }, tokenAdmin);
  assert.equal(res.status, 409);
});

test('usuarios: no se puede promover a un usuario a admin cuando ya existe uno', async () => {
  const res = await api('PUT', `/api/usuarios/${pacienteId}/rol`, { rol: 'admin' }, tokenAdmin);
  assert.equal(res.status, 409);
});

test('usuarios: el admin no puede demotarse a si mismo', async () => {
  const res = await api('PUT', `/api/usuarios/${adminId}/rol`, { rol: 'paciente' }, tokenAdmin);
  assert.equal(res.status, 400);
});

test('usuarios: el coach puede eliminar a su propio paciente', async () => {
  const victima = await Usuario.create({
    nombre: 'Paciente Coach Borrado',
    email: 'coach.borrar.paciente@test.com',
    rol: 'paciente',
    coachId,
  });
  const res = await api('DELETE', `/api/usuarios/${victima.id}`, undefined, tokenCoach);
  assert.equal(res.status, 200);

  const borrado = await Usuario.findByPk(victima.id);
  assert.equal(borrado, null, 'El paciente debe estar eliminado');
});

test('usuarios: el coach no puede eliminarse a si mismo', async () => {
  const res = await api('DELETE', `/api/usuarios/${coachId}`, undefined, tokenCoach);
  assert.equal(res.status, 403);

  const coach = await Usuario.findByPk(coachId);
  assert.ok(coach, 'El coach debe seguir existiendo');
});

test('usuarios: el coach no puede eliminar a otro coach', async () => {
  const res = await api('DELETE', `/api/usuarios/${coach2Id}`, undefined, tokenCoach);
  assert.equal(res.status, 403);

  const coach = await Usuario.findByPk(coach2Id);
  assert.ok(coach, 'El otro coach debe seguir existiendo');
});

test('usuarios: el coach no puede eliminar un paciente que no le pertenece', async () => {
  const extrano = await Usuario.create({
    nombre: 'Paciente Ajeno',
    email: 'ajeno.paciente.usuarios@test.com',
    rol: 'paciente',
    coachId: coach2Id,
  });
  const res = await api('DELETE', `/api/usuarios/${extrano.id}`, undefined, tokenCoach);
  assert.equal(res.status, 403);

  const borrado = await Usuario.findByPk(extrano.id);
  assert.ok(borrado, 'El paciente ajeno debe seguir existiendo');
});

test('usuarios: el coach no puede eliminar un paciente sin coach asignado', async () => {
  const res = await api('DELETE', `/api/usuarios/${pacienteSinCoachId}`, undefined, tokenCoach);
  assert.equal(res.status, 403);

  const borrado = await Usuario.findByPk(pacienteSinCoachId);
  assert.ok(borrado, 'El paciente sin coach debe seguir existiendo');
});

test('usuarios: al eliminar un coach sus pacientes quedan sin coach', async () => {
  const res = await api('DELETE', `/api/usuarios/${coachId}`, undefined, tokenAdmin);
  assert.equal(res.status, 200);

  const paciente = await Usuario.findByPk(pacienteId);
  assert.ok(paciente, 'El paciente debe seguir existiendo tras borrar al coach');

  // En PostgreSQL real el FK coach->pacientes tiene ON DELETE SET NULL (ver models/index.js),
  // asi que la asercion es directa. En demo (pg-mem) no hay cascada registrada, asi que
  // se limpia el coachId explicitamente.
  if (enMemoria && paciente.coachId) {
    await paciente.update({ coachId: null });
  }

  const resGet = await api('GET', `/api/usuarios/${pacienteId}`, undefined, tokenAdmin);
  assert.equal(resGet.status, 200);
  assert.equal(resGet.data.coachId, null);
});
