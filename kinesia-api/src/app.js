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

// Proxy hacia la Azure Function de estadísticas
app.get('/api/estadisticas/:usuarioId', async (req, res) => {
  const id = Number(req.params.usuarioId);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'usuarioId debe ser entero' });
  }
  if (!process.env.FUNCTIONS_URL) {
    return res.status(500).json({ error: 'FUNCTIONS_URL no configurada' });
  }
  try {
    const r = await fetch(`${process.env.FUNCTIONS_URL}/api/estadisticas/${id}`, {
      headers: process.env.FUNCTIONS_KEY ? { 'x-functions-key': process.env.FUNCTIONS_KEY } : {},
      signal: AbortSignal.timeout(8000),
    });
    const body = await r.json().catch(() => ({}));
    res.status(r.status).json(body);
  } catch {
    res.status(502).json({ error: 'El servicio de estadísticas no responde' });
  }
});

app.use('/api/usuarios', require('./routes/usuario.routes'));
app.use('/api/rutinas', require('./routes/rutina.routes'));
app.use('/api/sesiones', require('./routes/sesion.routes'));
app.use('/api/alimentos', require('./routes/alimento.routes'));
app.use('/api/ag', require('./routes/ag.routes'));

app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido' });
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;