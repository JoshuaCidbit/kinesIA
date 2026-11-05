const test = require('node:test');
const assert = require('node:assert/strict');
const { Buffer } = require('node:buffer');

// La API firma las URLs de los blobs para que se puedan leer aunque el
// contenedor sea privado. Usamos una connection string ficticia: la firma
// se calcula localmente, sin llamar a Azure.
process.env.AZURE_STORAGE_CONNECTION_STRING =
  'DefaultEndpointsProtocol=https;AccountName=testaccount;' +
  `AccountKey=${Buffer.alloc(32, 7).toString('base64')};` +
  'EndpointSuffix=core.windows.net';

const { urlArchivo } = require('../src/services/storage.service');

test('urlArchivo genera una URL SAS de solo lectura', () => {
  const url = new URL(urlArchivo('usuarios/foto.jpeg'));
  assert.equal(url.searchParams.get('sp'), 'r');
  assert.equal(url.searchParams.get('sr'), 'b');
  assert.ok(url.searchParams.get('sig'));
  assert.ok(new Date(url.searchParams.get('se')) > new Date());
});

test('urlArchivo devuelve null cuando no hay ruta', () => {
  assert.equal(urlArchivo(null), null);
  assert.equal(urlArchivo(''), null);
});

test('Usuario.toJSON entrega la foto como URL firmada', () => {
  process.env.USE_PG_MEM = 'true';
  process.env.DB_SSL = 'false';
  const { Usuario } = require('../src/models');
  const usuario = Usuario.build({
    id: 1,
    nombre: 'Ana',
    email: 'ana@example.com',
    edad: 25,
    fotoPath: 'usuarios/foto.jpeg',
    fotoUrl: 'https://kinesiastorage.blob.core.windows.net/kinesia-media/usuarios/foto.jpeg',
  });

  const json = usuario.toJSON();
  assert.match(json.fotoUrl, /[?&]sig=/);
  assert.equal(json.fotoPath, 'usuarios/foto.jpeg');
});
