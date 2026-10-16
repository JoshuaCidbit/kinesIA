const router = require('express').Router();
const c = require('../controllers/usuario.controller');
const validarId = require('../middlewares/validarId');
const { subirFoto } = require('../middlewares/upload');
const { manejarError } = require('../utils/helpers');

router.param('id', validarId);

router.post('/', c.crear);
router.get('/', c.listar);
router.get('/:id', c.obtener);
router.put('/:id', c.actualizar);
router.delete('/:id', c.eliminar);
router.post('/:id/foto', (req, res, next) => subirFoto(req, res, err => (err ? manejarError(res, err) : next())), c.subirFoto);

module.exports = router;
