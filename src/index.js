require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./models');

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await sequelize.authenticate();
    if (process.env.DB_SYNC === 'true') {
      await sequelize.sync({ alter: true });
      console.log('Base de datos KinesIA sincronizada con éxito.');
    }
    app.listen(PORT, () => console.log(`Servidor KinesIA ejecutándose en el puerto ${PORT}`));
  } catch (err) {
    console.error('No se pudo iniciar el servidor:', err.message);
    process.exit(1);
  }
})();
