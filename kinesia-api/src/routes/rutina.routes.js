const router = require('express').Router();
const c = require('../controllers/rutina.controller');
const { subirMedia } = require('../middlewares/upload');
const { auth, rol } = require('../middlewares/auth');

router.use(auth);
router.get('/', c.listar);        // abierto a cualquier autenticado (los pacientes eligen rutina al registrar sesión)
router.get('/:id', c.obtener);
router.post('/', rol('coach', 'admin'), c.crear);
router.put('/:id', rol('coach', 'admin'), c.actualizar);
router.delete('/:id', rol('coach', 'admin'), c.eliminar);
router.post('/:id/media', rol('coach', 'admin'), (req, res, next) => subirMedia(req, res, err => (err ? manejarError(res, err) : next())), c.subirMedia);

module.exports = router;