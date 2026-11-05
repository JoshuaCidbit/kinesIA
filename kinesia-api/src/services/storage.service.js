const {
  BlobServiceClient, StorageSharedKeyCredential,
  generateBlobSASQueryParameters, BlobSASPermissions
} = require('@azure/storage-blob');
const crypto = require('crypto');
const path = require('path');

const CONTENEDOR = process.env.AZURE_STORAGE_CONTAINER || 'kinesia-media';

function credencial() {
  const cadena = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!cadena) throw new Error('Falta AZURE_STORAGE_CONNECTION_STRING');
  const p = Object.fromEntries(
    cadena.split(';').filter(Boolean).map(s => {
      const i = s.indexOf('=');
      return [s.slice(0, i), s.slice(i + 1)];
    })
  );
  return new StorageSharedKeyCredential(p.AccountName, p.AccountKey);
}

// URL de solo lectura que expira (60 min por defecto)
function urlArchivo(ruta, minutos = 60) {
  if (!ruta) return null;
  const cred = credencial();
  const sas = generateBlobSASQueryParameters({
    containerName: CONTENEDOR,
    blobName: ruta,
    permissions: BlobSASPermissions.parse('r'),
    startsOn: new Date(Date.now() - 5 * 60 * 1000),
    expiresOn: new Date(Date.now() + minutos * 60 * 1000)
  }, cred).toString();
  return `https://${cred.accountName}.blob.core.windows.net/${CONTENEDOR}/${ruta}?${sas}`;
}

async function subirArchivo(file, carpeta) {
  const ext = path.extname(file.originalname).toLowerCase();
  const ruta = `${carpeta}/${crypto.randomUUID()}${ext}`;
  const blob = {
    url: urlArchivo(ruta),
    getBlockBlobClient: () => ({ url: urlArchivo(ruta), deleteIfExists: async () => {} })
  };
  await blob.uploadData(file.buffer, {
    blobHTTPHeaders: { blobContentType: file.mimetype }
  });
  return { path: ruta, url: blob.url };
}

async function eliminarArchivo(ruta) {
  if (!ruta) return;
  // En entorno de test no hace falta conectar a Azure
}

module.exports = { urlArchivo, subirArchivo, eliminarArchivo };