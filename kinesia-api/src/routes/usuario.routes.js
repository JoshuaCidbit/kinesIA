const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const c = require('../controllers/usuario.controller');
const validarId = require('../middlewares/validarId');
const { subirFoto } = require('../middlewares/upload');
const { manejarError } = require('../utils/helpers');
const { auth, rol, accesoPaciente } = require('../middlewares/auth');

router.param('id', validarId);

const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Demasiados intentos. Intenta de nuevo en unos minutos.' }
});
const delPaciente = accesoPaciente(r => r.params.id);

// Públicas
router.post('/login', limiteLogin, c.login);

// Cualquier usuario autenticado
router.get('/me', auth, c.me);
router.put('/me/password', auth, c.cambiarMiPassword);

// Solo admin
router.get('/coaches', auth, rol('admin'), c.listarCoaches);
router.put('/:id/coach', auth, rol('admin'), c.asignarCoach);
router.put('/:id/rol', auth, rol('admin'), c.cambiarRol);
router.put('/:id/password', auth, rol('admin'), c.resetPassword);

// Staff
router.post('/', auth, rol('coach', 'admin'), c.crear);
router.get('/', auth, rol('coach', 'admin'), c.listar);
router.delete('/:id', auth, rol('coach', 'admin'), delPaciente, c.eliminar);

// Paciente (solo el suyo), coach (los suyos), admin (todos)
router.get('/:id', auth, delPaciente, c.obtener);
router.put('/:id', auth, delPaciente, c.actualizar);
router.post('/:id/foto', auth, delPaciente, subirFoto, c.subirFoto);

module.exports = router;