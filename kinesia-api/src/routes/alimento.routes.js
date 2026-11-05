'use strict';
const router = require('express').Router();
const c = require('../controllers/alimento.controller');
const { auth, rol, accesoPaciente } = require('../middlewares/auth');

router.use(auth);

// GET /api/alimentos - lectura para cualquier autenticado
router.get('/', c.listar);

// GET /api/alimentos?q=... - filtro opcional
router.get('/', auth, c.listar);

// POST /api/alimentos - coach y admin (con protección de usuarioId)
router.post('/', auth, rol('admin', 'coach'), c.crear);

// PUT /api/alimentos/:id - coach y admin
router.put('/:id', auth, rol('coach', 'admin'), c.actualizar);

// DELETE /api/alimentos/:id - coach y admin
router.delete('/:id', auth, rol('coach', 'admin'), c.eliminar);

module.exports = router;