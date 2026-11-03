'use strict';
/**
 * Validación de POST /api/ag/calorico. Función pura (sin Express ni Sequelize)
 * para poder probarla con node:test.
 *
 * Contrato principal (producción):
 *   { usuarioId, peso, altura?, objetivo, alimentoIds: [1,2,3], opciones? }
 *
 * Se mantiene `alimentos` como compatibilidad para pruebas/sandbox. No se
 * permite enviar ambos.
 *
 * Devuelve { error } (mensaje en español → 400) o { datos } normalizados.
 */

const esNumero = v => typeof v === 'number' && Number.isFinite(v);
const esEntero = v => Number.isInteger(v);

// [campo, esEntero, min, max, default]
const OPCIONES = [
  ['poblacion', true, 10, 200, 60],
  ['generaciones', true, 10, 500, 200],
  ['probCrossover', false, 0, 1, 0.9],
  ['probMutacion', false, 0, 1, 0.2],
  ['elitismo', true, 0, 20, 4],
  ['tolerancia', false, 0, 100, 25],
  ['maxAlimentosPorComida', true, 1, 8, 4],
];

function validarAlimentos(alimentos) {
  if (!Array.isArray(alimentos) || alimentos.length === 0) {
    return { error: 'alimentos debe ser un arreglo no vacío' };
  }
  if (alimentos.length > 100) {
    return { error: 'alimentos no puede tener más de 100 elementos' };
  }
  const limpios = [];
  for (const [i, a] of alimentos.entries()) {
    if (!a || typeof a.nombre !== 'string' || !a.nombre.trim()) {
      return { error: `alimentos[${i}].nombre es obligatorio` };
    }
    if (a.nombre.trim().length > 100) {
      return { error: `alimentos[${i}].nombre no puede tener más de 100 caracteres` };
    }
    if (!esNumero(a.calorias) || a.calorias <= 0 || a.calorias > 5000) {
      return { error: `alimentos[${i}].calorias debe ser un número mayor que 0 y hasta 5000` };
    }
    // Solo campos permitidos (evita mass assignment)
    limpios.push({
      id: esEntero(a.id) ? a.id : i + 1,
      nombre: a.nombre.trim(),
      calorias: a.calorias,
      porcionBase: esNumero(a.porcionBase) ? a.porcionBase : null,
      unidad: typeof a.unidad === 'string' ? a.unidad.trim() : null,
    });
  }
  return { alimentos: limpios };
}

function validarAlimentoIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return { error: 'alimentoIds debe ser un arreglo no vacío' };
  }
  if (ids.length > 100) {
    return { error: 'alimentoIds no puede tener más de 100 elementos' };
  }
  if (!ids.every(id => esEntero(id) && id > 0)) {
    return { error: 'alimentoIds debe contener enteros positivos' };
  }
  if (new Set(ids).size !== ids.length) {
    return { error: 'alimentoIds no debe contener duplicados' };
  }
  return { alimentoIds: ids };
}

function validarOpciones(op) {
  if (op == null) op = {};
  if (typeof op !== 'object' || Array.isArray(op)) {
    return { error: 'opciones debe ser un objeto' };
  }
  const out = {};
  for (const [campo, entero, min, max, def] of OPCIONES) {
    const v = op[campo] ?? def;
    if (!esNumero(v) || (entero && !esEntero(v)) || v < min || v > max) {
      return {
        error: `opciones.${campo} debe ser ${entero ? 'un entero' : 'un número'} entre ${min} y ${max}`,
      };
    }
    out[campo] = v;
  }
  if (out.elitismo > out.poblacion) {
    return { error: 'opciones.elitismo no puede ser mayor que opciones.poblacion' };
  }

  const tieneMin = op.minComida != null;
  const tieneMax = op.maxComida != null;
  if (tieneMin !== tieneMax) {
    return { error: 'opciones.minComida y opciones.maxComida deben enviarse juntas' };
  }
  if (tieneMin) {
    if (!esNumero(op.minComida) || !esNumero(op.maxComida) || op.minComida <= 0 || op.minComida >= op.maxComida) {
      return { error: 'opciones.minComida debe ser un número positivo menor que opciones.maxComida' };
    }
    out.minComida = op.minComida;
    out.maxComida = op.maxComida;
  }

  if (op.seed != null) {
    if (!esEntero(op.seed)) return { error: 'opciones.seed debe ser un entero' };
    out.seed = op.seed;
  }
  return { opciones: out };
}

function validarSolicitud(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'El cuerpo de la petición debe ser un objeto JSON' };
  }
  const { usuarioId, peso, altura, objetivo } = body;

  if (!esEntero(usuarioId) || usuarioId <= 0) {
    return { error: 'usuarioId es obligatorio y debe ser un entero positivo' };
  }
  if (!esNumero(peso) || peso < 20 || peso > 300) {
    return { error: 'peso debe ser un número entre 20 y 300 (kg)' };
  }
  if (altura != null && (!esNumero(altura) || altura < 50 || altura > 250)) {
    return { error: 'altura debe ser un número entre 50 y 250 (cm)' };
  }
  if (objetivo !== 'cut' && objetivo !== 'bulk') {
    return { error: "objetivo debe ser 'cut' o 'bulk'" };
  }

  const usaIds = body.alimentoIds != null;
  const usaObjetos = body.alimentos != null;
  if (!usaIds && !usaObjetos) {
    return { error: 'Debes enviar alimentoIds (catálogo) o alimentos (sandbox)' };
  }
  if (usaIds && usaObjetos) {
    return { error: 'Envía alimentoIds o alimentos, pero no ambos' };
  }

  let alimentoIds;
  let alimentos;
  if (usaIds) {
    const a = validarAlimentoIds(body.alimentoIds);
    if (a.error) return a;
    alimentoIds = a.alimentoIds;
  } else {
    const a = validarAlimentos(body.alimentos);
    if (a.error) return a;
    alimentos = a.alimentos;
  }

  const o = validarOpciones(body.opciones);
  if (o.error) return o;

  return {
    datos: {
      usuarioId,
      peso,
      altura: altura ?? null,
      objetivo,
      alimentoIds,
      alimentos,
      opciones: o.opciones,
    },
  };
}

/** Los ids de ruta deben ser enteros positivos (evita pasar basura a Sequelize). */
function validarIdParam(valor) {
  return /^\d+$/.test(String(valor)) && Number(valor) > 0 ? Number(valor) : null;
}

module.exports = {
  validarSolicitud,
  validarAlimentos,
  validarAlimentoIds,
  validarOpciones,
  validarIdParam,
};
