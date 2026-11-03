const router = require('express').Router();
const c = require('../controllers/rutina.controller');
const validarId = require('../middlewares/validarId');
const { subirMedia } = require('../middlewares/upload');
const { manejarError } = require('../utils/helpers');

router.param('id', validarId);

router.post('/', c.crear);
router.get('/', c.listar);
router.get('/:id', c.obtener);
router.put('/:id', c.actualizar);
router.delete('/:id', c.eliminar);
router.post('/:id/media', (req, res, next) => subirMedia(req, res, err => (err ? manejarError(res, err) : next())), c.subirMedia);

module.exports = router;
