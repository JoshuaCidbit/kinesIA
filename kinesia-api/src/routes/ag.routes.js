'use strict';
const router = require('express').Router();
const c = require('../controllers/ag.controller');
const { auth, accesoPaciente } = require('../middlewares/auth');

// router.use(auth); // Ya está en el controller o se aplica por endpoint

// GET /api/ag/calorico - abierto a cualquier autenticado (cálculo general)
router.get('/calorico', auth, c.generar);

// POST /api/ag/calorico - requiere usuarioId en el body, proteger con accesoPaciente
router.post('/calorico', auth, accesoPaciente(r => r.body.usuarioId), c.generar);

// GET /api/ag/usuario/:usuarioId - lectura protegida por paciente/coach/admin
router.get('/usuario/:usuarioId', auth, accesoPaciente(r => r.params.usuarioId), c.listarPorUsuario);

// GET /api/ag/resultados/:id - abierto a cualquier autenticado
router.get('/resultados/:id', auth, c.obtener);

module.exports = router;