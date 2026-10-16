const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: 'ok', db: 'conectada', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'error', db: 'sin conexión' });
  }
});

app.use('/api/usuarios', require('./routes/usuario.routes'));
app.use('/api/rutinas', require('./routes/rutina.routes'));
app.use('/api/sesiones', require('./routes/sesion.routes'));

app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// JSON mal formado, etc.
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido' });
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;
