'use strict';
const router = require('express').Router();
const c = require('../controllers/estadisticas.controller');
const { auth, accesoPaciente } = require('../middlewares/auth');

// Solo admin, el coach del paciente o el propio paciente pueden consultar
// sus estadísticas. Las estadísticas son datos de salud: nunca sin auth.
router.get(
  '/:usuarioId',
  auth,
  accesoPaciente((req) => Number(req.params.usuarioId)),
  c.proxy,
);

module.exports = router;
