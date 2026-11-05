const { BlobServiceClient } = require('@azure/storage-blob');
const crypto = require('crypto');
const path = require('path');

const CONTENEDOR = process.env.AZURE_STORAGE_CONTAINER || 'kinesia-media';
let contenedor;

function getContenedor() {
  if (!contenedor) {
    const cadena = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!cadena) throw new Error('Falta AZURE_STORAGE_CONNECTION_STRING');
    contenedor = BlobServiceClient.fromConnectionString(cadena).getContainerClient(CONTENEDOR);
  }
  return contenedor;
}

// Sube un archivo (multer memoryStorage) y devuelve { path, url }
async function subirArchivo(file, carpeta) {
  const ext = path.extname(file.originalname).toLowerCase();
  const ruta = `${carpeta}/${crypto.randomUUID()}${ext}`;
  const blob = getContenedor().getBlockBlobClient(ruta);

  await blob.uploadData(file.buffer, {
    blobHTTPHeaders: { blobContentType: file.mimetype }
  });
  return { path: ruta, url: blob.url };
}

async function eliminarArchivo(ruta) {
  if (!ruta) return;
  try {
    await getContenedor().getBlockBlobClient(ruta).deleteIfExists();
  } catch (err) {
    console.error('No se pudo borrar el blob:', err.message);
  }
}

module.exports = { subirArchivo, eliminarArchivo };
