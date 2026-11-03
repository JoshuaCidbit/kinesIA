'use strict';
const router = require('express').Router();
const c = require('../controllers/ag.controller');

// OJO: `/resultados/:usuarioId` y `/resultados/:id` serían la MISMA ruta para
// Express (el primero siempre gana). Por eso el historial por paciente va en
// /usuario/:usuarioId, igual que /api/sesiones/usuario/:usuarioId.
router.post('/calorico', c.generar);
router.get('/usuario/:usuarioId', c.listarPorUsuario);
router.get('/resultados/:id', c.obtener);

module.exports = router;
