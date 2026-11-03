const multer = require('multer');

const memoria = multer.memoryStorage();

function archivoInvalido(mensaje) {
  const e = new Error(mensaje);
  e.name = 'ArchivoInvalido';
  return e;
}

const subirFoto = multer({
  storage: memoria,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) =>
    file.mimetype.startsWith('image/') ? cb(null, true) : cb(archivoInvalido('Solo se permiten imágenes'))
}).single('foto');

const subirMedia = multer({
  storage: memoria,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (req, file, cb) =>
    file.mimetype.startsWith('image/') || file.mimetype === 'video/mp4'
      ? cb(null, true)
      : cb(archivoInvalido('Solo imágenes o video MP4'))
}).single('media');

module.exports = { subirFoto, subirMedia };
