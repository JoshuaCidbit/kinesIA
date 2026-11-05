const router = require('express').Router();
const c = require('../controllers/sesion.controller');
const { auth, rol, accesoPaciente } = require('../middlewares/auth');

router.use(auth);

router.post('/', c.crear);                    // el controller verifica a quién pertenece
router.get('/', c.listar);                    // el controller filtra por rol
router.get('/usuario/:usuarioId', auth, accesoPaciente(r => r.params.usuarioId), c.listarPorUsuario);
router.get('/:id', c.obtener);                // el controller verifica propiedad
router.put('/:id', rol('coach', 'admin'), c.actualizar);
router.delete('/:id', rol('coach', 'admin'), c.eliminar);

module.exports = router;