require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./models');

const PORT = process.env.PORT || 3000;
const usarMemoria = process.env.USE_PG_MEM === 'true';

(async () => {
  try {
    await sequelize.authenticate();

    // pg-mem vive en memoria: hay que crear el esquema en cada arranque.
    // En PostgreSQL real solo se altera si DB_SYNC=true (explícito).
    if (usarMemoria) {
      await sequelize.sync({ force: true });
      console.log('Base de datos local (pg-mem) creada desde cero.');
    } else if (process.env.DB_SYNC === 'true') {
      await sequelize.sync({ alter: true });
      console.log('Base de datos KinesIA sincronizada con éxito.');
    }

    // Catálogo de alimentos: obligatorio en memoria (se pierde al reiniciar);
    // en PostgreSQL real es opt-in con SEED_ALIMENTOS=true.
    if (usarMemoria || process.env.SEED_ALIMENTOS === 'true') {
      // Require perezoso: si en Azure no se despliega data/ ni se activa el
      // seed, la API puede arrancar sin depender del archivo de alimentos.
      const { seedAlimentos } = require('./services/alimento.seed');
      const total = await seedAlimentos();
      console.log(`Catálogo de alimentos cargado: ${total} alimentos.`);
    }

    app.listen(PORT, () => console.log(`Servidor KinesIA ejecutándose en el puerto ${PORT}`));
  } catch (err) {
    console.error('No se pudo iniciar el servidor:', err.message);
    process.exit(1);
  }
})();
