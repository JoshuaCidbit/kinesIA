'use strict';
const router = require('express').Router();
const c = require('../controllers/alimento.controller');

router.get('/', c.listar);

module.exports = router;
