'use strict';
/**
 * Carga el catálogo de alimentos desde data/alimentos.json.
 *
 * Uso:
 *   npm run seed:alimentos                 # PostgreSQL real (DATABASE_URL)
 *   USE_PG_MEM=true npm run seed:alimentos  # prueba rápida en memoria
 *
 * Es idempotente: usa `codigo` como llave única (upsert), así que se puede
 * ejecutar varias veces sin duplicar filas.
 */
require('dotenv').config();
const { sequelize } = require('../src/models');
const { seedAlimentos } = require('../src/services/alimento.seed');

(async () => {
  try {
    const usarMemoria = process.env.USE_PG_MEM === 'true';
    await sequelize.authenticate();

    // En memoria la BD nace vacía en cada proceso. En PostgreSQL real se crea
    // la tabla si aún no existe (sync sin alter no destruye datos).
    if (usarMemoria) {
      await sequelize.sync({ force: true });
    } else {
      await sequelize.sync();
    }

    const total = await seedAlimentos();
    console.log(`Catálogo cargado: ${total} alimentos.`);
    await sequelize.close();
  } catch (err) {
    console.error('No se pudo cargar el catálogo:', err.message);
    process.exitCode = 1;
    await sequelize.close().catch(() => {});
  }
})();
