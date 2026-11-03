'use strict';
const { sequelize, Alimento } = require('../models');
const crudo = require('../../data/alimentos.json');

function normalizar(a, i) {
  if (!a || typeof a !== 'object') {
    throw new Error(`Fila ${i + 1}: debe ser un objeto`);
  }
  const codigo = String(a.codigo || '').trim();
  const nombre = String(a.nombre || '').trim();
  const calorias = Number(a.calorias);
  const porcionBase = Number(a.porcionBase ?? 100);
  const unidad = String(a.unidad || 'g').trim();

  if (!codigo) throw new Error(`Fila ${i + 1}: falta "codigo"`);
  if (!nombre) throw new Error(`Fila ${i + 1}: falta "nombre"`);
  if (!Number.isFinite(calorias) || calorias <= 0) {
    throw new Error(`Fila ${i + 1} (${codigo}): "calorias" debe ser > 0`);
  }
  if (!Number.isFinite(porcionBase) || porcionBase <= 0) {
    throw new Error(`Fila ${i + 1} (${codigo}): "porcionBase" debe ser > 0`);
  }
  if (!unidad) throw new Error(`Fila ${i + 1} (${codigo}): falta "unidad"`);

  const numeroOpcional = (valor, campo) => {
    if (valor == null || valor === '') return null;
    const n = Number(valor);
    if (!Number.isFinite(n) || n < 0) {
      throw new Error(`Fila ${i + 1} (${codigo}): "${campo}" debe ser un número >= 0`);
    }
    return n;
  };

  return {
    codigo,
    nombre,
    categoria: a.categoria ? String(a.categoria).trim() : null,
    calorias,
    porcionBase,
    unidad,
    proteinas: numeroOpcional(a.proteinas, 'proteinas'),
    carbohidratos: numeroOpcional(a.carbohidratos, 'carbohidratos'),
    grasas: numeroOpcional(a.grasas, 'grasas'),
    activo: a.activo !== false,
  };
}

async function seedAlimentos() {
  const datos = Array.isArray(crudo) ? crudo : crudo.alimentos;
  if (!Array.isArray(datos) || datos.length === 0) {
    throw new Error('data/alimentos.json no contiene alimentos');
  }

  const filas = datos.map(normalizar);
  const codigos = new Set();
  for (const f of filas) {
    if (codigos.has(f.codigo)) {
      throw new Error(`Código duplicado en el archivo: ${f.codigo}`);
    }
    codigos.add(f.codigo);
  }

  await sequelize.transaction(async (t) => {
    for (const fila of filas) {
      await Alimento.upsert(fila, { transaction: t });
    }
  });

  return filas.length;
}

module.exports = { seedAlimentos };
