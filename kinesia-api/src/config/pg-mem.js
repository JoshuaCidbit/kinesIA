'use strict';
/**
 * PostgreSQL en memoria SOLO para la demo local (`USE_PG_MEM=true`).
 * En Azure se sigue usando el driver real `pg` y PostgreSQL Flexible Server.
 *
 * Se crea una sola instancia para que todos los modelos compartan la misma BD.
 */
const { newDb } = require('pg-mem');

const db = newDb();
module.exports = db.adapters.createPg();
