'use strict';
/**
 * Smoke test del AG contra una API ya desplegada (Azure o local).
 *
 * Uso:
 *   BASE_URL=https://kinesia-api-....azurewebsites.net npm run smoke:ag
 *   BASE_URL=http://localhost:3000 npm run smoke:ag
 *
 * Crea un usuario temporal, genera un plan, consulta historial y detalle,
 * prueba errores esperados y elimina el usuario al final.
 */

const BASE = (process.env.BASE_URL || 'https://kinesia-api-gfbna7fab0gxdjc7.mexicocentral-01.azurewebsites.net').replace(/\/$/, '');

let fallos = 0;
const ok = (cond, mensaje, extra = '') => {
  if (cond) {
    console.log(`OK   ${mensaje}${extra ? ` · ${extra}` : ''}`);
  } else {
    fallos++;
    console.error(`FAIL ${mensaje}${extra ? ` · ${extra}` : ''}`);
  }
};

async function api(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const texto = await res.text();
  let data;
  try { data = texto ? JSON.parse(texto) : null; } catch { data = texto; }
  return { status: res.status, data };
}

(async () => {
  console.log(`Smoke AG contra ${BASE}\n`);

  const health = await api('GET', '/api/health');
  ok(health.status === 200 && health.data?.db === 'conectada', 'GET /api/health', `HTTP ${health.status}`);

  const catalogo = await api('GET', '/api/alimentos');
  ok(catalogo.status === 200 && Array.isArray(catalogo.data), 'GET /api/alimentos', `HTTP ${catalogo.status}`);
  ok(catalogo.data?.length >= 40, 'catálogo cargado', `${catalogo.data?.length ?? 0} alimentos`);

  const busqueda = await api('GET', '/api/alimentos?q=pollo');
  ok(busqueda.status === 200 && busqueda.data?.length >= 1, 'GET /api/alimentos?q=pollo', `${busqueda.data?.length ?? 0} resultados`);

  const sufijo = Date.now();
  const usuario = await api('POST', '/api/usuarios', {
    nombre: 'Smoke AG Azure',
    email: `smoke.ag.${sufijo}@kinesia.local`,
    edad: 30,
  });
  ok(usuario.status === 201 && usuario.data?.id > 0, 'POST /api/usuarios', `HTTP ${usuario.status}`);
  const usuarioId = usuario.data?.id;

  try {
    const ids = (catalogo.data || []).slice(0, 12).map((a) => a.id);
    const plan = await api('POST', '/api/ag/calorico', {
      usuarioId,
      peso: 70,
      objetivo: 'cut',
      alimentoIds: ids,
      opciones: { seed: 42 },
    });
    ok(plan.status === 201, 'POST /api/ag/calorico', `HTTP ${plan.status}`);
    ok(plan.data?.cumpleRestricciones === true, 'plan cumple restricciones');
    ok(plan.data?.mejorDistribucion?.length === 5, 'plan tiene 5 comidas', `${plan.data?.mejorDistribucion?.length ?? 0}`);
    ok(
      plan.data && Math.abs(plan.data.totalDiario - plan.data.caloriasObjetivo) <= 25,
      'total diario dentro de tolerancia',
      `${plan.data?.totalDiario} / ${plan.data?.caloriasObjetivo} kcal`
    );

    const planId = plan.data?.id;
    const historial = await api('GET', `/api/ag/usuario/${usuarioId}`);
    ok(historial.status === 200 && historial.data?.length >= 1, 'GET /api/ag/usuario/:id', `${historial.data?.length ?? 0} registros`);

    const detalle = await api('GET', `/api/ag/resultados/${planId}`);
    ok(detalle.status === 200 && detalle.data?.mejorDistribucion?.length === 5, 'GET /api/ag/resultados/:id', `HTTP ${detalle.status}`);

    const ambos = await api('POST', '/api/ag/calorico', {
      usuarioId,
      peso: 70,
      objetivo: 'cut',
      alimentoIds: [ids[0]],
      alimentos: [{ nombre: 'X', calorias: 100 }],
    });
    ok(ambos.status === 400, 'error esperado: alimentoIds + alimentos', `HTTP ${ambos.status}`);

    const inexistente = await api('POST', '/api/ag/calorico', {
      usuarioId,
      peso: 70,
      objetivo: 'cut',
      alimentoIds: [999999],
    });
    ok(inexistente.status === 400, 'error esperado: alimento inexistente', `HTTP ${inexistente.status}`);

    const lechuga = (catalogo.data || []).find((a) => a.codigo === 'lechuga');
    if (lechuga) {
      const infactible = await api('POST', '/api/ag/calorico', {
        usuarioId,
        peso: 70,
        objetivo: 'cut',
        alimentoIds: [lechuga.id],
      });
      ok(infactible.status === 422, 'error esperado: plan infactible', `HTTP ${infactible.status}`);
    }
  } finally {
    if (usuarioId) {
      const borrar = await api('DELETE', `/api/usuarios/${usuarioId}`);
      ok(borrar.status === 200, 'limpieza: DELETE /api/usuarios/:id', `HTTP ${borrar.status}`);
    }
  }

  console.log(`\n${fallos === 0 ? 'Smoke AG OK' : `${fallos} comprobaciones fallaron`}`);
  if (fallos > 0) process.exit(1);
})().catch((err) => {
  console.error('Smoke AG falló:', err.message);
  process.exit(1);
});
