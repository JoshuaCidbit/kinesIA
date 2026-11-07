'use strict';
const router = require('express').Router();
const c = require('../controllers/alimento.controller');
const { auth, rol } = require('../middlewares/auth');

// El catálogo de alimentos es datos de referencia: lectura para cualquier
// usuario autenticado. No es publico (auth a nivel de router).
router.use(auth);

// GET /api/alimentos - lectura para cualquier autenticado (con o sin ?q=)
router.get('/', c.listar);

// POST /api/alimentos - coach y admin
router.post('/', auth, rol('admin', 'coach'), c.crear);

// PUT /api/alimentos/:id - coach y admin
router.put('/:id', auth, rol('coach', 'admin'), c.actualizar);

// DELETE /api/alimentos/:id - coach y admin
router.delete('/:id', auth, rol('coach', 'admin'), c.eliminar);

module.exports = router;
