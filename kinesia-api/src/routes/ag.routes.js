'use strict';
const router = require('express').Router();
const c = require('../controllers/ag.controller');
const { auth, accesoPaciente } = require('../middlewares/auth');

// Todas las rutas de AG exigen autenticacion; el acceso a datos de un paciente
// concreto lo resuelve el middleware accesoPaciente.

// GET /api/ag/calorico - calculo general para un usuario autenticado
router.get('/calorico', auth, c.generar);

// POST /api/ag/calorico - requiere usuarioId en el body, proteger con accesoPaciente
router.post('/calorico', auth, accesoPaciente((req) => req.body.usuarioId), c.generar);

// GET /api/ag/usuario/:usuarioId - lectura protegida por paciente/coach/admin
router.get('/usuario/:usuarioId', auth, accesoPaciente((req) => Number(req.params.usuarioId)), c.listarPorUsuario);

// GET /api/ag/resultados/:id - acceso segun el paciente propietario del resultado
router.get('/resultados/:id', auth, c.obtener);

module.exports = router;
