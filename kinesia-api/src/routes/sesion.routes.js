'use strict';
const router = require('express').Router();
const c = require('../controllers/sesion.controller');
const { auth, rol, accesoPaciente } = require('../middlewares/auth');

// Autenticacion y autorizacion a nivel de router.
// El control de propiedad sobre un paciente concreto se resuelve con el
// middleware accesoPaciente; no se confia en que el controller lo verifique.
router.use(auth);

// Registro de sesion: el paciente solo registra sesiones para si mismo
// (si omite usuarioId en el body, se usa el suyo).
router.post('/', auth, accesoPaciente((req) => req.body.usuarioId ?? req.usuario.id), c.crear);

// Listado: el controller filtra por rol (paciente: los suyos; coach: los suyos; admin: todos).
router.get('/', auth, c.listar);

// Historial de un paciente concreto: solo admin, coach de ese paciente o el propio paciente.
router.get('/usuario/:usuarioId', auth, accesoPaciente((req) => Number(req.params.usuarioId)), c.listarPorUsuario);

// Detalle de una sesion: el ownership lo resuelve el controller contra la sesion cargada.
router.get('/:id', auth, c.obtener);

router.put('/:id', auth, rol('coach', 'admin'), c.actualizar);
router.delete('/:id', auth, rol('coach', 'admin'), c.eliminar);

module.exports = router;
