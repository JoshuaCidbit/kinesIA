'use strict';
const CaloricoAG = require('../ag/caloricoAG');
const { validarSolicitud, validarIdParam } = require('../ag/validacion');
const { Usuario, AgResultado, Alimento } = require('../models');
const { manejarError } = require('../utils/helpers');
const { puedeVer } = require('../middlewares/auth');

/** Misma forma para POST (201) y GET detalle (200). */
function formatear(r) {
  const extra = r.opcionesJson || {};
  return {
    id: r.id,
    usuarioId: r.usuarioId,
    objetivo: r.objetivo,
    peso: r.peso,
    altura: r.altura,
    caloriasObjetivo: r.caloriasObjetivo,
    totalDiario: r.totalDiario,
    rangoPorComida: extra.rangoPorComida,
    mejorDistribucion: r.distribucionJson,
    fitness: r.fitness,
    violacion: r.violacion,
    cumpleRestricciones: r.cumpleRestricciones,
    generaciones: r.generaciones,
    historial: extra.historial,
    opciones: extra.opciones,
    createdAt: r.createdAt,
  };
}

/** Resuelve los alimentos del catálogo (producción) o del body (sandbox). */
async function resolverAlimentos(datos) {
  if (datos.alimentoIds) {
    const filas = await Alimento.findAll({
      where: { id: datos.alimentoIds, activo: true },
    });
    if (filas.length !== datos.alimentoIds.length) {
      return { error: 'Uno o más alimentos no existen o están inactivos' };
    }
    const porId = new Map(filas.map(a => [a.id, a]));
    return {
      alimentos: datos.alimentoIds.map(id => {
        const a = porId.get(id);
        return {
          id: a.id,
          nombre: a.nombre,
          calorias: a.calorias,
          porcionBase: a.porcionBase,
          unidad: a.unidad,
        };
      }),
    };
  }
  return { alimentos: datos.alimentos };
}

// POST /api/ag/calorico
// Orden: 400 (datos) → 404 (usuario) → 400 (alimentos) → 422 (infeasible) → 201
exports.generar = async (req, res) => {
  try {
    const { error, datos } = validarSolicitud(req.body);
    if (error) return res.status(400).json({ error });

    const usuario = await Usuario.findByPk(datos.usuarioId);
    if (!usuario) return res.status(404).json({ error: 'El usuario indicado no existe' });

    const resuelto = await resolverAlimentos(datos);
    if (resuelto.error) return res.status(400).json({ error: resuelto.error });

    const opcionesAG = { ...datos.opciones, peso: datos.peso, objetivo: datos.objetivo };
    const fact = CaloricoAG.verificarFactibilidad(resuelto.alimentos, opcionesAG);
    if (!fact.ok) return res.status(422).json({ error: fact.motivo });

    const t0 = Date.now();
    const r = new CaloricoAG(resuelto.alimentos, opcionesAG).ejecutar();
    console.log(`[AG] usuario=${datos.usuarioId} ${Date.now() - t0}ms gen=${r.generaciones} valido=${r.cumpleRestricciones}`);

    const fila = await AgResultado.create({
      usuarioId: datos.usuarioId,
      objetivo: datos.objetivo,
      peso: datos.peso,
      altura: datos.altura,
      caloriasObjetivo: r.caloriasObjetivo,
      totalDiario: r.totalDiario,
      fitness: r.fitness,
      violacion: r.violacion,
      generaciones: r.generaciones,
      cumpleRestricciones: r.cumpleRestricciones,
      distribucionJson: r.mejorDistribucion,
      opcionesJson: {
        opciones: datos.opciones,
        rangoPorComida: r.rangoPorComida,
        historial: r.historial,
        alimentoIds: datos.alimentoIds ?? resuelto.alimentos.map(a => a.id),
      },
    });
    return res.status(201).json(formatear(fila));
  } catch (err) {
    return manejarError(res, err);
  }
};

// GET /api/ag/usuario/:usuarioId  → historial resumido
exports.listarPorUsuario = async (req, res) => {
  try {
    const usuarioId = validarIdParam(req.params.usuarioId);
    if (!usuarioId) return res.status(400).json({ error: 'usuarioId inválido' });
    if (!(await Usuario.findByPk(usuarioId))) {
      return res.status(404).json({ error: 'El usuario indicado no existe' });
    }
    const filas = await AgResultado.findAll({
      where: { usuarioId },
      attributes: ['id', 'objetivo', 'peso', 'caloriasObjetivo', 'totalDiario', 'cumpleRestricciones', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });
    return res.json(filas);
  } catch (err) {
    return manejarError(res, err);
  }
};

// GET /api/ag/resultados/:id  → detalle completo
exports.obtener = async (req, res) => {
  try {
    const id = validarIdParam(req.params.id);
    if (!id) return res.status(400).json({ error: 'id inválido' });
    const fila = await AgResultado.findByPk(id);
    if (!fila) return res.status(404).json({ error: 'Resultado no encontrado' });
    if (!(await puedeVer(req.usuario, fila.usuarioId))) {
      return res.status(403).json({ error: 'No tienes permisos sobre este resultado' });
    }
    return res.json(formatear(fila));
  } catch (err) {
    return manejarError(res, err);
  }
};
