// genetico/caloricoAG.js
/**
 * Algoritmo Genético para distribución de calorías en 5 comidas (KinesIA).
 *
 * Cromosoma: array de 5 comidas; cada comida es un array de genes
 *   { idx: <índice en this.alimentos>, porciones: <0.5 .. 3> }
 * Fitness: se MINIMIZA (0 = solución perfecta).
 */

const PERFILES = {
  // factor = kcal por kg de peso (punto medio de la tabla del prompt)
  cut: { factor: 27.5, minComida: 250, maxComida: 450 },
  bulk: { factor: 40, minComida: 500, maxComida: 800 },
};

const PORCIONES = [0.5, 1, 1.5, 2, 2.5, 3];

class CaloricoAG {
  /**
   * @param {Array<{id?:number,nombre:string,calorias:number}>} alimentos
   * @param {Object} opciones
   *   objetivo ('cut'|'bulk'), peso (kg), caloriasObjetivoDiarias,
   *   minComida, maxComida, poblacion, generaciones, probCrossover,
   *   probMutacion, elitismo, tolerancia (kcal)
   */
  constructor(alimentos, opciones = {}) {
    if (!Array.isArray(alimentos) || alimentos.length === 0) {
      throw new Error('Se requiere al menos un alimento');
    }
    const objetivo = opciones.objetivo ?? 'bulk';
    if (!PERFILES[objetivo]) throw new Error("objetivo debe ser 'cut' o 'bulk'");

    const perfil = PERFILES[objetivo];
    this.alimentos = alimentos;
    this.objetivo = objetivo;
    this.numComidas = 5;

    // `??` en lugar de `||` para respetar valores 0 explícitos
    this.tamPoblacion = opciones.poblacion ?? 60;
    this.generaciones = opciones.generaciones ?? 200;
    this.probCrossover = opciones.probCrossover ?? 0.9;
    this.probMutacion = opciones.probMutacion ?? 0.2;
    this.elitismo = opciones.elitismo ?? 4;
    this.tolerancia = opciones.tolerancia ?? 25; // kcal de diferencia aceptada
    this.minComida = opciones.minComida ?? perfil.minComida;
    this.maxComida = opciones.maxComida ?? perfil.maxComida;

    this.peso = opciones.peso ?? 0;
    this.caloriasObjetivoDiarias =
      opciones.caloriasObjetivoDiarias ?? this.peso * perfil.factor;
    if (!(this.caloriasObjetivoDiarias > 0)) {
      throw new Error('Indica peso o caloriasObjetivoDiarias');
    }
  }

  // ---------- utilidades ----------
  _rand(n) { return Math.floor(Math.random() * n); }
  _porcion() { return PORCIONES[this._rand(PORCIONES.length)]; }

  _kcalGen(g) { return this.alimentos[g.idx].calorias * g.porciones; }
  _kcalComida(comida) { return comida.reduce((s, g) => s + this._kcalGen(g), 0); }

  _comidaAleatoria() {
    const n = Math.min(1 + this._rand(4), this.alimentos.length);
    const usados = new Set();
    while (usados.size < n) usados.add(this._rand(this.alimentos.length));
    return [...usados].map(idx => ({ idx, porciones: this._porcion() }));
  }

  // ---------- población ----------
  inicializarPoblacion() {
    return Array.from({ length: this.tamPoblacion }, () =>
      Array.from({ length: this.numComidas }, () => this._comidaAleatoria())
    );
  }

  // ---------- fitness (menor = mejor) ----------
  calcularFitness(individuo) {
    let total = 0;
    let penalizacionRango = 0;

    for (const comida of individuo) {
      const kcal = this._kcalComida(comida);
      total += kcal;
      if (kcal < this.minComida) penalizacionRango += this.minComida - kcal;
      else if (kcal > this.maxComida) penalizacionRango += kcal - this.maxComida;
    }

    const desviacion = Math.abs(total - this.caloriasObjetivoDiarias);
    // Las violaciones de rango pesan el doble que la desviación total
    return desviacion + 2 * penalizacionRango;
  }

  _esValido(individuo) {
    const total = individuo.reduce((s, c) => s + this._kcalComida(c), 0);
    const enRango = individuo.every(c => {
      const k = this._kcalComida(c);
      return k >= this.minComida && k <= this.maxComida;
    });
    return enRango && Math.abs(total - this.caloriasObjetivoDiarias) <= this.tolerancia;
  }

  // ---------- operadores ----------
  seleccionTorneo(poblacion, fitness) {
    const n = poblacion.length;
    return Array.from({ length: n }, () => {
      const a = this._rand(n), b = this._rand(n);
      return fitness[a] <= fitness[b] ? poblacion[a] : poblacion[b];
    });
  }

  /** Crossover de un punto sobre el eje de comidas. */
  crossover(p1, p2) {
    const punto = 1 + this._rand(this.numComidas - 1);
    const clonar = c => c.map(g => ({ ...g }));
    return [
      [...p1.slice(0, punto), ...p2.slice(punto)].map(clonar),
      [...p2.slice(0, punto), ...p1.slice(punto)].map(clonar),
    ];
  }

  mutar(individuo) {
    const nuevo = individuo.map(c => c.map(g => ({ ...g })));
    if (Math.random() >= this.probMutacion) return nuevo;

    const comida = nuevo[this._rand(this.numComidas)];
    const op = this._rand(3);

    if (op === 0) {
      // cambiar un alimento por otro que no esté ya en la comida
      const pos = this._rand(comida.length);
      const usados = new Set(comida.map(g => g.idx));
      if (usados.size < this.alimentos.length) {
        let idx;
        do { idx = this._rand(this.alimentos.length); } while (usados.has(idx));
        comida[pos].idx = idx;
      }
    } else if (op === 1) {
      // cambiar las porciones de un alimento
      comida[this._rand(comida.length)].porciones = this._porcion();
    } else if (comida.length < 4 && Math.random() < 0.5) {
      // agregar un alimento
      const usados = new Set(comida.map(g => g.idx));
      if (usados.size < this.alimentos.length) {
        let idx;
        do { idx = this._rand(this.alimentos.length); } while (usados.has(idx));
        comida.push({ idx, porciones: this._porcion() });
      }
    } else if (comida.length > 1) {
      // quitar un alimento (siempre queda al menos uno)
      comida.splice(this._rand(comida.length), 1);
    }
    return nuevo;
  }

  // ---------- ejecución ----------
  ejecutar() {
    let poblacion = this.inicializarPoblacion();
    let mejor = null;
    let generacionFinal = 0;
    const historial = [];

    for (let gen = 0; gen < this.generaciones; gen++) {
      generacionFinal = gen;
      const fitness = poblacion.map(ind => this.calcularFitness(ind));
      const orden = [...poblacion.keys()].sort((a, b) => fitness[a] - fitness[b]);

      const mejorIdx = orden[0];
      if (!mejor || fitness[mejorIdx] < mejor.fitness) {
        mejor = { individuo: poblacion[mejorIdx], fitness: fitness[mejorIdx] };
      }
      historial.push(mejor.fitness);
      if (this._esValido(mejor.individuo)) break;

      // selección + crossover
      const padres = this.seleccionTorneo(poblacion, fitness);
      const hijos = [];
      for (let i = 0; i < this.tamPoblacion; i += 2) {
        const p1 = padres[i];
        const p2 = padres[i + 1] ?? padres[0];
        if (Math.random() < this.probCrossover) hijos.push(...this.crossover(p1, p2));
        else hijos.push(p1, p2);
      }

      // mutación
      const hijosMutados = hijos.map(h => this.mutar(h));

      // reemplazo generacional con elitismo (tamaño de población constante)
      const elite = orden.slice(0, this.elitismo).map(i => poblacion[i]);
      poblacion = [...elite, ...hijosMutados].slice(0, this.tamPoblacion);
    }

    return this._formatearResultado(mejor, generacionFinal, historial);
  }

  _formatearResultado(mejor, generaciones, historial) {
    const comidas = mejor.individuo.map((comida, i) => ({
      comida: i + 1,
      alimentos: comida.map(g => ({
        id: this.alimentos[g.idx].id ?? g.idx,
        nombre: this.alimentos[g.idx].nombre,
        porciones: g.porciones,
        calorias: Math.round(this._kcalGen(g)),
      })),
      total: Math.round(this._kcalComida(comida)),
    }));
    return {
      objetivo: this.objetivo,
      caloriasObjetivo: Math.round(this.caloriasObjetivoDiarias),
      totalDiario: comidas.reduce((s, c) => s + c.total, 0),
      rangoPorComida: [this.minComida, this.maxComida],
      mejorDistribucion: comidas,
      fitness: mejor.fitness,
      cumpleRestricciones: this._esValido(mejor.individuo),
      generaciones: generaciones + 1,
      historial,
    };
  }
}

module.exports = CaloricoAG;