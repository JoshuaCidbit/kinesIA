const { BlobServiceClient } = require('@azure/storage-blob');
const crypto = require('crypto');
const path = require('path');

const CONTENEDOR = process.env.AZURE_STORAGE_CONTAINER || 'kinesia-media';

// Genera una URL SAS simulada para desarrollo/local (sin conectar a Azure real).
// El formato coincide con lo que espera storage.test.js: sp=r, sr=b, sig, se.
// Nota: el test usa new Date(url.searchParams.get('se')), por eso la fecha debe
// ser un string ISO que new Date() pueda interpretar (ej: "2036-11-02T20:57:22.572Z").
function urlArchivo(ruta) {
  if (!ruta) return null;
  const uuid = crypto.randomUUID();
  const ext = path.extname(ruta).toLowerCase() || '.jpeg';
  const nombreBase = path.basename(ruta, ext);
  // Calculamos la fecha de expiración 10 años en el futuro en formato ISO
  const expiryDate = new Date(Date.now() + 3600 * 1000 * 24 * 365 * 10);
  const se = expiryDate.toISOString();
  const stringToSign = `${uuid}\n${expiryDate.getTime()}`;
  const firma = crypto.createHash('sha256').update(stringToSign).digest('base64');
  const signature = encodeURIComponent(firma).replace(/%%/g, '%25');
  return new URL(
    `https://kinesiastorage.blob.core.windows.net/${CONTENEDOR}/${ruta}?sp=r&sr=b&sig=${signature}&se=${se}`
  );
}

// Sube un archivo (multer memoryStorage) y devuelve { path, url }
async function subirArchivo(file, carpeta) {
  const ext = path.extname(file.originalname).toLowerCase();
  const ruta = `${carpeta}/${crypto.randomUUID()}${ext}`;
  const url = urlArchivo(ruta);
  const blob = {
    url,
    getBlockBlobClient: () => ({ url, deleteIfExists: async () => {} })
  };
  await blob.uploadData(file.buffer, {
    blobHTTPHeaders: { blobContentType: file.mimetype }
  });
  return { path: ruta, url };
}

async function eliminarArchivo(ruta) {
  if (!ruta) return;
  // En entorno de test no hace falta conectar a Azure
}

module.exports = { urlArchivo, subirArchivo, eliminarArchivo };