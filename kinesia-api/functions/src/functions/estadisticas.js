// Azure Function (HTTP trigger): GET /api/estadisticas/{usuarioId}
// Calcula métricas de progreso de un paciente a partir de sus sesiones.
const { app } = require('@azure/functions');
const { Pool } = require('pg');

let pool;
function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL');
    const u = new URL(process.env.DATABASE_URL);
    pool = new Pool({
      host: u.hostname,
      port: Number(u.port) || 5432,
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.slice(1),
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
      max: 2,
      idleTimeoutMillis: 10000
    });
  }
  return pool;
}

app.http('estadisticas', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'estadisticas/{usuarioId}',
  handler: async (request, context) => {
    const { usuarioId } = request.params;
    if (!/^\d+$/.test(usuarioId || '')) {
      return { status: 400, jsonBody: { error: 'usuarioId inválido' } };
    }

    try {
      const db = getPool();

      const usuario = await db.query('SELECT id, nombre FROM usuarios WHERE id = $1', [usuarioId]);
      if (usuario.rowCount === 0) {
        return { status: 404, jsonBody: { error: 'Usuario no encontrado' } };
      }

      const resumen = (await db.query(
        `SELECT COUNT(*)                               AS "totalSesiones",
                COALESCE(SUM(repeticiones), 0)         AS "totalRepeticiones",
                AVG("precisionPromedio")               AS "precisionPromedio",
                MAX("precisionPromedio")               AS "mejorPrecision"
           FROM sesiones_terapia WHERE "usuarioId" = $1`, [usuarioId]
      )).rows[0];

      const recientes = (await db.query(
        `SELECT fecha, "precisionPromedio" FROM sesiones_terapia
          WHERE "usuarioId" = $1 ORDER BY fecha DESC LIMIT 5`, [usuarioId]
      )).rows;

      let tendencia = 'sin datos suficientes';
      if (recientes.length >= 2) {
        const delta = recientes[0].precisionPromedio - recientes[recientes.length - 1].precisionPromedio;
        tendencia = delta > 1 ? 'mejorando' : delta < -1 ? 'empeorando' : 'estable';
      }

      return {
        status: 200,
        jsonBody: {
          usuario: usuario.rows[0],
          totalSesiones: Number(resumen.totalSesiones),
          totalRepeticiones: Number(resumen.totalRepeticiones),
          precisionPromedio: resumen.precisionPromedio === null ? null : Number(Number(resumen.precisionPromedio).toFixed(2)),
          mejorPrecision: resumen.mejorPrecision === null ? null : Number(resumen.mejorPrecision),
          tendencia,
          ultimasSesiones: recientes
        }
      };
    } catch (err) {
      context.error(err);
      return { status: 500, jsonBody: { error: 'Error interno del servidor' } };
    }
  }
});
