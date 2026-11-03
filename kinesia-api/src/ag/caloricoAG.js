'use strict';
/**
 * Algoritmo Genético calórico de KinesIA.
 *
 * Módulo PURO: no importa Express ni Sequelize. Distribuye las calorías
 * diarias en 5 comidas eligiendo alimentos y porciones.
 *
 * Individuo  = arreglo de 5 comidas
 * Comida     = arreglo de genes { idx, porciones }  (idx apunta a `alimentos`)
 * Fitness    = menor es mejor. La factibilidad se prioriza con una
 *              penalización muy alta y, además, se conserva `mejorValido`
 *              por separado para no devolver un plan inválido si existe uno válido.
 */

const NUM_COMIDAS = 5;
const PORCIONES = [0.5, 1, 1.5, 2, 2.5, 3];
const FACTORES = { cut: 27.5, bulk: 40 }; // kcal por kg de peso
const PESO_VIOLACION = 1_000_000;
const EPS = 1e-9;

const DEFAULTS = {
  poblacion: 60,
  generaciones: 200,
  probCrossover: 0.9,
  probMutacion: 0.2,
  elitismo: 4,
  tolerancia: 25,
  maxAlimentosPorComida: 4,
  tiempoMaxMs: 4000, // tope de seguridad: el AG es CPU-bound y bloquea el event loop
};

/** PRNG con semilla (reproducibilidad en pruebas). */
function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const redondear = (n, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

class CaloricoAG {
  /**
   * @param {{id?:number,nombre:string,calorias:number,porcionBase?:number,unidad?:string}[]} alimentos
   * @param {object} opciones peso, objetivo ('cut'|'bulk'), caloriasObjetivo?,
   *   minComida?, maxComida?, y los parámetros de DEFAULTS (+ seed)
   */
  constructor(alimentos, opciones = {}) {
    if (!Array.isArray(alimentos) || alimentos.length === 0) {
      throw new Error('alimentos debe ser un arreglo no vacío');
    }

    this.alimentos = alimentos;
    this.opts = { ...DEFAULTS, ...opciones };

    if (this.opts.caloriasObjetivo == null) {
      if (!Number.isFinite(Number(this.opts.peso)) || Number(this.opts.peso) <= 0) {
        throw new Error('peso debe ser un número positivo');
      }
    }
    if (!Number.isInteger(this.opts.poblacion) || this.opts.poblacion < 1) {
      throw new Error('poblacion debe ser un entero positivo');
    }
    if (!Number.isInteger(this.opts.generaciones) || this.opts.generaciones < 1) {
      throw new Error('generaciones debe ser un entero positivo');
    }

    this.objetivoDiario = CaloricoAG.calcularObjetivoDiario(this.opts);
    const [min, max] = CaloricoAG.resolverRango(
      this.objetivoDiario, this.opts.minComida, this.opts.maxComida
    );
    this.minComida = min;
    this.maxComida = max;

    this.maxAlim = Math.min(this.opts.maxAlimentosPorComida, alimentos.length);
    this.random = this.opts.seed != null && this.opts.seed !== ''
      ? mulberry32(Number(this.opts.seed))
      : Math.random;
  }

  // ───────────── Factibilidad (estática, se usa antes de ejecutar) ─────────────

  static calcularObjetivoDiario({ peso, objetivo, caloriasObjetivo }) {
    if (caloriasObjetivo != null) return caloriasObjetivo;
    const factor = FACTORES[objetivo];
    if (!factor) throw new Error("objetivo debe ser 'cut' o 'bulk'");
    return peso * factor;
  }

  /** Rango por comida. Si no se indica, ±20 % del promedio (5 comidas). */
  static resolverRango(objetivoDiario, minComida, maxComida) {
    if (minComida != null && maxComida != null) return [minComida, maxComida];
    const avg = objetivoDiario / NUM_COMIDAS;
    return [0.8 * avg, 1.2 * avg];
  }

  /**
   * Comprueba que EXISTA al menos una forma de cumplir las restricciones
   * (condición necesaria). Evita ejecutar el AG sobre problemas imposibles.
   *
   * 1) Rango por comida vs objetivo diario (con tolerancia).
   * 2) Alcance real de los alimentos: con a lo sumo `maxAlim` alimentos
   *    distintos por comida y porciones en [0.5, 3], cada comida solo puede
   *    sumar entre minAlcanzable y maxAlcanzable kcal.
   */
  static verificarFactibilidad(alimentos, opciones = {}) {
    if (!Array.isArray(alimentos) || alimentos.length === 0) {
      return { ok: false, motivo: 'Se requiere al menos un alimento' };
    }

    const o = { ...DEFAULTS, ...opciones };
    const objetivo = CaloricoAG.calcularObjetivoDiario(o);
    const [min, max] = CaloricoAG.resolverRango(objetivo, o.minComida, o.maxComida);
    const tol = o.tolerancia;

    if (NUM_COMIDAS * min > objetivo + tol + EPS || NUM_COMIDAS * max < objetivo - tol - EPS) {
      return {
        ok: false,
        motivo: 'Los rangos por comida no permiten alcanzar el objetivo diario',
        objetivo, min, max,
      };
    }

    const cals = alimentos.map(a => a.calorias).sort((a, b) => b - a);
    const k = Math.min(o.maxAlimentosPorComida, cals.length);
    const maxAlc = cals.slice(0, k).reduce((s, c) => s + c, 0) * PORCIONES[PORCIONES.length - 1];
    const minAlc = cals[cals.length - 1] * PORCIONES[0];

    const lo = Math.max(min, minAlc);
    const hi = Math.min(max, maxAlc);
    if (lo > hi + EPS) {
      return {
        ok: false,
        motivo: 'Con los alimentos indicados no se puede cubrir el rango calórico de una comida',
        objetivo, min, max,
      };
    }
    if (NUM_COMIDAS * lo > objetivo + tol + EPS || NUM_COMIDAS * hi < objetivo - tol - EPS) {
      return {
        ok: false,
        motivo: 'Con los alimentos indicados no se puede alcanzar el objetivo diario',
        objetivo, min, max,
      };
    }
    return { ok: true, objetivo, min, max };
  }

  // ───────────── Representación y fitness ─────────────

  _porcionAleatoria() {
    return PORCIONES[Math.floor(this.random() * PORCIONES.length)];
  }

  /** Índices de alimento distintos (barajado parcial Fisher-Yates). */
  _indicesDistintos(n) {
    const idx = this.alimentos.map((_, i) => i);
    for (let i = 0; i < n; i++) {
      const j = i + Math.floor(this.random() * (idx.length - i));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    return idx.slice(0, n);
  }

  _comidaAleatoria() {
    const n = 1 + Math.floor(this.random() * this.maxAlim);
    return this._indicesDistintos(n).map(idx => ({ idx, porciones: this._porcionAleatoria() }));
  }

  _individuoAleatorio() {
    return Array.from({ length: NUM_COMIDAS }, () => this._comidaAleatoria());
  }

  inicializarPoblacion() {
    return Array.from({ length: this.opts.poblacion }, () => this._individuoAleatorio());
  }

  _kcalComida(comida) {
    return comida.reduce((s, g) => s + this.alimentos[g.idx].calorias * g.porciones, 0);
  }

  /**
   * Evalúa un individuo.
   *   violacionRango = Σ kcal fuera de [min,max] en cada comida
   *   violacionTotal = kcal que el total diario excede la tolerancia
   *   fitness        = violacion * 1e6 + desviacion   (factibilidad primero)
   */
  evaluar(ind) {
    const porComida = ind.map(c => this._kcalComida(c));
    const total = porComida.reduce((s, k) => s + k, 0);

    let violacionRango = 0;
    for (const k of porComida) {
      violacionRango += Math.max(0, this.minComida - k) + Math.max(0, k - this.maxComida);
    }
    const desviacion = Math.abs(total - this.objetivoDiario);
    const violacionTotal = Math.max(0, desviacion - this.opts.tolerancia);
    const violacion = violacionRango + violacionTotal;

    return {
      porComida, total, desviacion, violacion,
      valido: violacion <= EPS,
      fitness: violacion * PESO_VIOLACION + desviacion,
    };
  }

  calcularFitness(ind) { return this.evaluar(ind).fitness; }
  _esValido(ind) { return this.evaluar(ind).valido; }

  // ───────────── Operadores ─────────────

  _clonar(ind) { return ind.map(c => c.map(g => ({ ...g }))); }

  _torneo(poblacion, fitness) {
    const a = Math.floor(this.random() * poblacion.length);
    const b = Math.floor(this.random() * poblacion.length);
    return fitness[a] <= fitness[b] ? poblacion[a] : poblacion[b];
  }

  /** Cruce de un punto sobre las 5 comidas. */
  _cruce(p1, p2) {
    if (this.random() >= this.opts.probCrossover) return [this._clonar(p1), this._clonar(p2)];
    const punto = 1 + Math.floor(this.random() * (NUM_COMIDAS - 1));
    const h1 = [...p1.slice(0, punto), ...p2.slice(punto)];
    const h2 = [...p2.slice(0, punto), ...p1.slice(punto)];
    return [this._clonar(h1), this._clonar(h2)];
  }

  /** Mutación por comida: cambiar alimento / cambiar porción / agregar / quitar. */
  _mutar(ind) {
    for (const comida of ind) {
      if (this.random() >= this.opts.probMutacion) continue;
      const op = Math.floor(this.random() * 4);
      const usados = new Set(comida.map(g => g.idx));
      const libres = this.alimentos.map((_, i) => i).filter(i => !usados.has(i));

      if (op === 0 && libres.length) { // cambiar alimento
        const g = comida[Math.floor(this.random() * comida.length)];
        g.idx = libres[Math.floor(this.random() * libres.length)];
      } else if (op === 1) { // cambiar porción
        const g = comida[Math.floor(this.random() * comida.length)];
        g.porciones = this._porcionAleatoria();
      } else if (op === 2 && comida.length < this.maxAlim && libres.length) { // agregar
        comida.push({
          idx: libres[Math.floor(this.random() * libres.length)],
          porciones: this._porcionAleatoria(),
        });
      } else if (op === 3 && comida.length > 1) { // quitar
        comida.splice(Math.floor(this.random() * comida.length), 1);
      }
    }
    return ind;
  }

  // ───────────── Ejecución ─────────────

  ejecutar() {
    const { generaciones, elitismo, poblacion: tam } = this.opts;
    const inicio = Date.now();
    let poblacion = this.inicializarPoblacion();

    let mejor = null;       // mejor por fitness (puede ser inválido)
    let mejorValido = null; // mejor entre los que cumplen TODAS las restricciones
    const historial = [];
    let ejecutadas = 0;
    let tiempoAgotado = false;

    // Parada temprana: hay un plan válido y casi clavado al objetivo.
    const paradaDesv = Math.min(5, this.opts.tolerancia);

    for (let gen = 0; gen < generaciones; gen++) {
      const evals = poblacion.map(ind => this.evaluar(ind));
      const fitness = evals.map(e => e.fitness);
      const orden = [...poblacion.keys()].sort((a, b) => fitness[a] - fitness[b]);

      // El mejor válido se trackea APARTE: nunca se pierde aunque la
      // población posterior empeore (p. ej. elitismo = 0).
      for (const i of orden) {
        const cand = { ind: this._clonar(poblacion[i]), ev: evals[i] };
        if (!mejor || cand.ev.fitness < mejor.ev.fitness) mejor = cand;
        if (cand.ev.valido && (!mejorValido || cand.ev.fitness < mejorValido.ev.fitness)) {
          mejorValido = cand;
        }
        if (cand.ev.valido) break; // los siguientes válidos son peores
      }

      historial.push(redondear(mejorValido ? mejorValido.ev.fitness : mejor.ev.fitness, 2));
      ejecutadas = gen + 1;

      if (mejorValido && mejorValido.ev.desviacion <= paradaDesv) break;
      if (Date.now() - inicio > this.opts.tiempoMaxMs) { tiempoAgotado = true; break; }
      if (gen === generaciones - 1) break;

      // Siguiente generación: elitismo + hijos
      const nueva = orden.slice(0, Math.min(elitismo, tam)).map(i => this._clonar(poblacion[i]));
      while (nueva.length < tam) {
        const p1 = this._torneo(poblacion, fitness);
        const p2 = this._torneo(poblacion, fitness);
        const [h1, h2] = this._cruce(p1, p2);
        nueva.push(this._mutar(h1));
        if (nueva.length < tam) nueva.push(this._mutar(h2));
      }
      poblacion = nueva;
    }

    return this._formatear(mejorValido ?? mejor, Boolean(mejorValido), historial, ejecutadas, tiempoAgotado);
  }

  _formatear(res, cumple, historial, generaciones, tiempoAgotado) {
    if (!res) throw new Error('No se generó ningún individuo');
    const { ind, ev } = res;
    const mejorDistribucion = ind.map((comida, i) => ({
      comida: i + 1,
      alimentos: comida.map(g => {
        const a = this.alimentos[g.idx];
        return {
          id: a.id ?? g.idx + 1,
          nombre: a.nombre,
          porciones: g.porciones,
          porcionBase: a.porcionBase ?? null,
          unidad: a.unidad ?? null,
          calorias: redondear(a.calorias * g.porciones),
        };
      }),
      total: redondear(ev.porComida[i]),
    }));

    return {
      caloriasObjetivo: redondear(this.objetivoDiario),
      totalDiario: redondear(ev.total),
      rangoPorComida: [redondear(this.minComida, 0), redondear(this.maxComida, 0)],
      mejorDistribucion,
      fitness: redondear(ev.fitness, 2),
      violacion: redondear(ev.violacion, 2),
      cumpleRestricciones: cumple,
      generaciones,
      historial,
      tiempoAgotado,
    };
  }
}

module.exports = CaloricoAG;
module.exports.CaloricoAG = CaloricoAG;
module.exports.constantes = { NUM_COMIDAS, PORCIONES, FACTORES, DEFAULTS };
