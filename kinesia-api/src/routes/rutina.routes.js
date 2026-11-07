const router = require('express').Router();
const c = require('../controllers/rutina.controller');
const { subirMedia } = require('../middlewares/upload');
const { manejarError } = require('../utils/helpers');
const { auth, rol } = require('../middlewares/auth');

// Todas las rutinas requieren autenticacion (auth a nivel de router);
// las de escritura restringen a coach/admin.
router.use(auth);
router.get('/', c.listar);        // autenticado: los pacientes eligen rutina al registrar sesion
router.get('/:id', c.obtener);
router.post('/', rol('coach', 'admin'), c.crear);
router.put('/:id', rol('coach', 'admin'), c.actualizar);
router.delete('/:id', rol('coach', 'admin'), c.eliminar);
router.post('/:id/media', rol('coach', 'admin'), (req, res, next) => subirMedia(req, res, err => (err ? manejarError(res, err) : next())), c.subirMedia);

module.exports = router;
