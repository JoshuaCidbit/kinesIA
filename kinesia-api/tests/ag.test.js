'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

const CaloricoAG = require('../src/ag/caloricoAG');
const {
  validarSolicitud,
  validarAlimentoIds,
  validarOpciones,
  validarIdParam,
} = require('../src/ag/validacion');
const catalogo = require('../data/alimentos.json');

const ALIMENTOS = [
  { id: 1, nombre: 'Pechuga de pollo', calorias: 165, porcionBase: 100, unidad: 'g' },
  { id: 2, nombre: 'Arroz blanco cocido', calorias: 130, porcionBase: 100, unidad: 'g' },
  { id: 3, nombre: 'Aguacate', calorias: 160, porcionBase: 100, unidad: 'g' },
  { id: 4, nombre: 'Avena', calorias: 389, porcionBase: 100, unidad: 'g' },
  { id: 5, nombre: 'Salmón', calorias: 208, porcionBase: 100, unidad: 'g' },
  { id: 6, nombre: 'Brócoli', calorias: 34, porcionBase: 100, unidad: 'g' },
  { id: 7, nombre: 'Aceite de oliva', calorias: 119, porcionBase: 15, unidad: 'ml' },
  { id: 8, nombre: 'Yogurt griego', calorias: 97, porcionBase: 100, unidad: 'g' },
  { id: 9, nombre: 'Plátano', calorias: 89, porcionBase: 100, unidad: 'g' },
  { id: 10, nombre: 'Almendras', calorias: 579, porcionBase: 100, unidad: 'g' },
];

test('catálogo de ejemplo: >= 40 alimentos, códigos únicos y calorías válidas', () => {
  assert.ok(Array.isArray(catalogo));
  assert.ok(catalogo.length >= 40, `solo hay ${catalogo.length} alimentos`);
  const codigos = new Set();
  for (const [i, a] of catalogo.entries()) {
    assert.equal(typeof a.codigo, 'string', `fila ${i} sin codigo`);
    assert.ok(a.codigo.trim().length > 0);
    assert.ok(!codigos.has(a.codigo), `código duplicado: ${a.codigo}`);
    codigos.add(a.codigo);
    assert.equal(typeof a.nombre, 'string', `${a.codigo} sin nombre`);
    assert.ok(Number(a.calorias) > 0, `${a.codigo} con calorías inválidas`);
    assert.ok(Number(a.porcionBase) > 0, `${a.codigo} con porción inválida`);
    assert.ok(typeof a.unidad === 'string' && a.unidad.length > 0, `${a.codigo} sin unidad`);
  }
});

test('objetivo diario: cut/bulk y calorías explícitas', () => {
  assert.equal(CaloricoAG.calcularObjetivoDiario({ peso: 70, objetivo: 'cut' }), 1925);
  assert.equal(CaloricoAG.calcularObjetivoDiario({ peso: 70, objetivo: 'bulk' }), 2800);
  assert.equal(
    CaloricoAG.calcularObjetivoDiario({ peso: 70, objetivo: 'cut', caloriasObjetivo: 2000 }),
    2000
  );
  assert.throws(() => CaloricoAG.calcularObjetivoDiario({ peso: 70, objetivo: 'otro' }), /objetivo/);
});

test('rango por comida: ±20 % del promedio por defecto', () => {
  const [min, max] = CaloricoAG.resolverRango(2000);
  assert.equal(min, 320);
  assert.equal(max, 480);
  assert.deepEqual(CaloricoAG.resolverRango(2000, 300, 500), [300, 500]);
});

test('factibilidad: detecta alimentos vacíos y rangos imposibles', () => {
  assert.equal(CaloricoAG.verificarFactibilidad([]).ok, false);

  const imposible = CaloricoAG.verificarFactibilidad(ALIMENTOS, {
    peso: 70,
    objetivo: 'cut',
    minComida: 1000,
    maxComida: 1200,
  });
  assert.equal(imposible.ok, false);
  assert.match(imposible.motivo, /rangos por comida/i);

  const factible = CaloricoAG.verificarFactibilidad(ALIMENTOS, { peso: 70, objetivo: 'cut' });
  assert.equal(factible.ok, true);
  assert.equal(factible.objetivo, 1925);
});

test('AG determinista: genera 5 comidas y respeta las restricciones', () => {
  const ag = new CaloricoAG(ALIMENTOS, {
    peso: 70,
    objetivo: 'cut',
    poblacion: 80,
    generaciones: 250,
    seed: 2026,
    tolerancia: 25,
  });
  const r = ag.ejecutar();

  assert.equal(r.mejorDistribucion.length, 5);
  assert.equal(r.cumpleRestricciones, true);
  assert.ok(Math.abs(r.totalDiario - r.caloriasObjetivo) <= 25 + 1e-6);
  assert.equal(r.rangoPorComida.length, 2);

  for (const comida of r.mejorDistribucion) {
    assert.ok(comida.alimentos.length >= 1);
    assert.ok(comida.total >= r.rangoPorComida[0] - 0.1);
    assert.ok(comida.total <= r.rangoPorComida[1] + 0.1);
    for (const a of comida.alimentos) {
      assert.ok(a.nombre);
      assert.ok(a.porciones >= 0.5 && a.porciones <= 3);
      assert.ok(a.calorias > 0);
    }
  }

  assert.ok(r.historial.length >= 1);
  assert.ok(r.generaciones >= 1 && r.generaciones <= 250);
  assert.equal(typeof r.tiempoAgotado, 'boolean');
});

test('AG con semilla distinta sigue siendo reproducible', () => {
  const opciones = { peso: 80, objetivo: 'bulk', poblacion: 60, generaciones: 120, seed: 7 };
  const a = new CaloricoAG(ALIMENTOS, opciones).ejecutar();
  const b = new CaloricoAG(ALIMENTOS, opciones).ejecutar();
  assert.deepEqual(a, b);
});

test('validación: alimentoIds correctos', () => {
  const { error, datos } = validarSolicitud({
    usuarioId: 1,
    peso: 70,
    objetivo: 'cut',
    alimentoIds: [1, 2, 3],
  });
  assert.equal(error, undefined);
  assert.deepEqual(datos.alimentoIds, [1, 2, 3]);
  assert.equal(datos.alimentos, undefined);
  assert.equal(datos.opciones.poblacion, 60);
  assert.equal(datos.opciones.tolerancia, 25);
});

test('validación: rechaza enviar alimentoIds y alimentos a la vez', () => {
  const { error } = validarSolicitud({
    usuarioId: 1,
    peso: 70,
    objetivo: 'cut',
    alimentoIds: [1],
    alimentos: [{ nombre: 'Pollo', calorias: 165 }],
  });
  assert.match(error, /no ambos/i);
});

test('validación: rechaza ids duplicados, no enteros o vacíos', () => {
  assert.match(validarAlimentoIds([]).error, /no vacío/i);
  assert.match(validarAlimentoIds([1, 1]).error, /duplicados/i);
  assert.match(validarAlimentoIds([1, '2']).error, /enteros positivos/i);
  assert.match(validarAlimentoIds([1, -2]).error, /enteros positivos/i);
  assert.match(validarAlimentoIds([1, 2.5]).error, /enteros positivos/i);
});

test('validación: compatibilidad con el body `alimentos` del sandbox', () => {
  const { error, datos } = validarSolicitud({
    usuarioId: 2,
    peso: 60,
    objetivo: 'bulk',
    alimentos: [
      { nombre: '  Pollo  ', calorias: 165, porcionBase: 100, unidad: 'g' },
      { nombre: 'Arroz', calorias: 130 },
    ],
  });
  assert.equal(error, undefined);
  assert.equal(datos.alimentos[0].nombre, 'Pollo');
  assert.equal(datos.alimentos[1].porcionBase, null);
  assert.equal(datos.alimentoIds, undefined);
});

test('validación: opciones fuera de rango y rangos incompletos', () => {
  assert.match(validarOpciones({ poblacion: 5 }).error, /poblacion/);
  assert.match(validarOpciones({ elitismo: 20, poblacion: 10 }).error, /elitismo/);
  assert.match(validarOpciones({ minComida: 300 }).error, /deben enviarse juntas/i);
  assert.match(validarOpciones({ minComida: 500, maxComida: 400 }).error, /minComida/);
  assert.equal(validarOpciones({ seed: 42 }).opciones.seed, 42);
});

test('validación: ids de ruta', () => {
  assert.equal(validarIdParam('12'), 12);
  assert.equal(validarIdParam('0'), null);
  assert.equal(validarIdParam('abc'), null);
  assert.equal(validarIdParam('-1'), null);
  assert.equal(validarIdParam('1.5'), null);
});
