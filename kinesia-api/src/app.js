const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');

const app = express();

// CORS: lista de orígenes permitidos separados por coma (CORS_ORIGIN).
// En producción define CORS_ORIGIN con la URL del front.
const origins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(cors({ origin: origins }));
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
app.use('/api/alimentos', require('./routes/alimento.routes'));
app.use('/api/ag', require('./routes/ag.routes'));
app.use('/api/estadisticas', require('./routes/estadisticas.routes'));

app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido' });
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;