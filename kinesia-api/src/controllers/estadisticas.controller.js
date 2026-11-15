'use strict';
/**
 * Proxy hacia la Azure Function de estadísticas.
 *
 * La API es la única que conoce FUNCTIONS_URL/FUNCTIONS_KEY; el frontend
 * consume `/api/estadisticas/:usuarioId` y el authorization por paciente
 * se resuelve con el middleware accesoPaciente en las rutas.
 */
exports.proxy = async (req, res) => {
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
};
