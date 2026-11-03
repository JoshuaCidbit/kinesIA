const router = require('express').Router();
const c = require('../controllers/sesion.controller');
const validarId = require('../middlewares/validarId');

router.param('id', validarId);
router.param('usuarioId', validarId);

router.post('/', c.crear);
router.get('/', c.listar);
router.get('/usuario/:usuarioId', c.listarPorUsuario); // antes de '/:id'
router.get('/:id', c.obtener);
router.put('/:id', c.actualizar);
router.delete('/:id', c.eliminar);

module.exports = router;
