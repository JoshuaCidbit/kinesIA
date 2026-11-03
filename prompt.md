# Prompt para la elaboración del Algoritmo Genético para problema de distribución calórica

## 1. Información relevante del proyecto

### Estructura actual
- **Proyecto**: KinesIA - sistema de gestión de terapia física y fitness
- **Backend**: Node.js + Express.js con PostgreSQL en Azure
- **Frontend**: Aplicación que consume la API REST
- **Algoritmo genético existente**: `kinesia-AG/AG.py` - implementación básica en Python con NumPy que incluye:
  - Creación de población inicial
  - Función de fitness (actualmente ecuación de esfera)
  - Selección por torneo binario
  - Crossover alfa mixto
  - Mutación aleatoria
  - Reemplazo generacional con elitismo

### Endpoints API relevantes
- `GET /api/usuarios` - Listar usuarios (para obtener peso, altura, objetivo cut/bulk)
- `POST /api/usuarios` - Registrar nuevo usuario
- `GET /api/estadisticas/:usuarioId` - Obtener métricas del usuario

### Restricciones y requisitos del problema
1. **Objetivo**: Sumatoria de calorías deseadas distribuidas en 5 comidas
2. **Restricciones por comida**: Cada comida debe tener un mínimo y máximo de calorías
3. **Tipo de objetivo**: `cut` o `bulk` (definirá el rango calórico objetivo)
4. **Datos del usuario**: Peso, altura y objetivo (cut/bulk) Obtenidos del archivo `contenido_calorico`
5. **Estructura**: Similar al problema de la mochila - elegir la mejor permutación de alimentos

### Archivo `contenido_calorico`
- **Estado actual**: El archivo aún no contiene datos (según indicó el usuario: "aun no hay datos a tomar en cuenta")
- **Estructura esperada**: Contendrá los valores de contenido calórico de los alimentos, incluyendo:
  - Nombre del alimento
  - Calorías por porción
  - Possiblemente: peso, altura relatados o datos nutricionales adicionales
- **Nota**: Los contenidos deben incluirse en el prompt una vez disponibles, pero por ahora se deja espacio para su inserción

## 2. Posibles soluciones

### Enfoque principal: Algoritmo Genético (AG)

El algoritmo genético debe estar diseñado para:

1. **Codificación de cromosomas**:
   - Cada cromosoma representa una posible solución (distribución de calorías en 5 comidas)
   - Los genes representan la selección y asignación de alimentos a cada comida
   - Formato: `[alimento_1_comida1, ..., alimento_n_comida1, alimento_1_comida2, ..., alimento_n_comida5]`

2. **Función de fitness** (objetivo a maximizar/minimizar):
   - **Suma de calorías totales** en las 5 comidas
   - **Penalización** si alguna comida se sale del rango [mín, máx]
   - **Penalización** si la suma total no coincide con el objetivo (cut/bulk)
   - **Precisión**: Qué tan cerca está la distribución del objetivo deseado

3. **Restricciones de calorías por comida**:
   - Cada comida i debe satisficar: `min_caloricas <= calorias_comida_i <= max_caloricas`
   - Los rangos varían según el objetivo:
     - **Cut**: Rango calórico más bajo, enfocado en definición
     - **Bulk**: Rango calórico más alto, enfocado en ganancia de masa

4. **Operadores genéticos**:
   - **Selección**: Torneo binario (ya implementado en AG.py)
   - **Crossover**: Crossover alfa mixto o crossover de un punto para preservar combinaciones de alimentos
   - **Mutación**: Cambio aleatorio de un alimento por otro en una posición específica

5. **Población inicial**:
   - Generar individuos aleatorios dentro de rangos válidos
   - Asegurar que cada comida tenga al menos un alimento asignado
   - Pesos iniciales basados en disponibilidad de alimentos del archivo `contenido_calorico`

### Enfoque secundario: Programación lineal entera (ILP)
- Podría usarse como método de comparación o para validar resultados óptimos
- Menos flexible para restricciones dinámicas por usuario

### Enfoque terciario: Búsqueda local
- Hill climbing o simulated annealing para refinar soluciones del AG

## 3. Código necesario para el algoritmo genético

### Estructura recomendada (adaptada a JavaScript/Node.js para compatibilidad con el proyecto)

```javascript
// archivo: genetico/caloricoAG.js

/**
 * Algoritmo Genético para distribución de calorías en 5 comidas
 * Basado en la implementación de AG.py de kinesia-AG
 * Adaptado a Node.js/TypeScript para compatibilidad con kinesia-api
 */

class CaloricoAG {
  constructor(alimentos, opciones = {}) {
    // alimentos: array de objetos { nombre, calorias }
    // opciones: { poblacion = 50, generaciones = 100, probCrossover = 0.9, 
    //             probMutacion = 0.1, elitismo = 5, minComida = 200, maxComida = 800 }
    this.alimentos = alimentos;
    this.tamPoblacion = opciones.poblacion || 50;
    this.generaciones = opciones.generaciones || 100;
    this.probCrossover = opciones.probCrossover || 0.9;
    this.probMutacion = opciones.probMutacion || 0.1;
    this.elitismo = opciones.elitismo || 5;
    this.minComida = opciones.minComida || 200;
    this.maxComida = opciones.maxComida || 800;
    this.numComidas = 5;
    
    // Parámetros derivados del usuario (se cargarán después)
    this.peso = 0;
    this.altura = 0;
    this.objetivo = 'bulk'; // o 'cut'
    this.caloriasObjetivoDiarias = 0;
  }

  /**
   * Inicializar población aleatoria
   * Cada individuo es un array de 5 arrays (una por comida)
   * Cada comida contiene índices de alimentos seleccionados
   */
  inicializarPoblacion() {
    const poblacion = [];
    for (let i = 0; i < this.tamPoblacion; i++) {
      const individuo = [];
      for (let comida = 0; comida < this.numComidas; comida++) {
        // Seleccionar entre 1-4 alimentos aleatorios por comida
        const numAlimentos = 1 + Math.floor(Math.random() * 4);
        const seleccionados = new Set();
        while (seleccionados.size < numAlimentos) {
          seleccionados.add(Math.floor(Math.random() * this.alimentos.length));
        }
        individuo.pusha(Array.from(seleccionados));
      }
      poblacion.push(individuo);
    }
    return poblacion;
  }

  /**
   * Función de fitness - evalúa qué tan buena es una solución
   * @param {Array} individuo - distribución de alimentos en 5 comidas
   * @returns {Number} fitness (menor es mejor, o mayor según diseño)
   */
  calcularFitness(individuo) {
    const totalesComidas = new Array(this.numComidas).fill(0);
    const caloriasTotales = this.alimentos.reduce((sum, _, i) => {
      // Contar cuántas veces aparece el alimento en el individuo
      let count = 0;
      for (const comida of individuo) {
        if (comida.includes(i)) count++;
      }
      return sum + (count * this.alimentos[i].calorias);
    }, 0);
    
    // Sumar calorías de cada comida
    for (let comida = 0; comida < this.numComidas; comida++) {
      for (const idx of individuo[comida]) {
        totalesComidas[comida] += this.alimentos[idx].calorias;
      }
      
      // Aplicar penalización si la comida se sale del rango
      if (totalesComidas[comida] < this.minComida) {
        // Penalización por debajo del mínimo
        totalesComidas[comida] = this.minComida - totalesComidas[comida];
      } else if (totalesComidas[comida] > this.maxComida) {
        // Penalización por encima del máximo
        totalesComidas[comida] = totalesComidas[comida] - this.maxComida;
      }
    }
    
    // Calorías totales objetivo según cut/bulk
    const objetivoMeta = this.objetivo === 'cut' ? this.caloriasObjetivoDiarias * 0.8 : this.caloriasObjetivoDiarias * 1.2;
    const deviation = Math.abs(caloriasTotales - objetivoMeta);
    
    // Fitness: menor es mejor. Combinar restricciones con desviación objetivo
    let fitness = deviation;
    for (const t of totalesComidas) {
      fitness += Math.abs(t - (this.minComida + this.maxComida) / 2); // Desviación ideal por comida
    }
    
    return fitness;
  }

  /**
   * Selección por torneo binario
   */
  seleccionTorneo(poblacion, fitnesss) {
    const tam = poblacion.length;
    const ganadores = [];
    for (let i = 0; i < tam; i++) {
      const idx1 = Math.floor(Math.random() * tam);
      const idx2 = Math.floor(Math.random() * tam);
      const ganador = fitnesss[idx1] <= fitnesss[idx2] ? poblacion[idx1] : poblacion[idx2];
      ganadores.push(ganador);
    }
    return ganadores;
  }

  /**
   * Crossover de un punto entre dos padres
   */
  crossover(padre1, padre2) {
    const numGenes = this.numComidas;
    // Elegir punto de corte aleatorio (entre 1 y numGenes-1)
    const punto = 1 + Math.floor(Math.random() * (numGenes - 1));
    
    const hijo1 = padre1.slice(0, punto).concat(padre2.slice(punto));
    const hijo2 = padre2.slice(0, punto).concat(padre1.slice(punto));
    
    return [hijo1, hijo2];
  }

  /**
   * Mutación: cambiar un alimento aleatorio por otro en una comida aleatoria
   */
  mutar(individuo) {
    const nuevo = individuo.map(comida => [...comida]); // copia profunda
    
    if (Math.random() < this.probMutacion) {
      // Elegir comida aleatoria
      const comidaIdx = Math.floor(Math.random() * this.numComidas);
      // Reemplazar un alimento aleatorio de esa comida
      if (nuevo[comidaIdx].length > 0) {
        const pos = Math.floor(Math.random() * nuevo[comidaIdx].length);
        nuevo[comidaIdx][pos] = Math.floor(Math.random() * this.alimentos.length);
      }
    }
    
    return nuevo;
  }

  /**
   * Ejecutar el algoritmo genético completo
   */
  async ejecutar() {
    // 1. Inicializar población
    let poblacion = this.inicializarPoblacion();
    
    // 2. Ejecutar generaciones
    for (let gen = 0; gen < this.generaciones; gen++) {
      // Calcular fitness de toda la población
      const fitnesss = poblacion.map(ind => this.calcularFitness(ind));
      
      // Verificar si encontramos solución satisfactoria
      const mejorIdx = fitnesss.indexOf(Math.min(...fitnesss));
      const mejorFitness = fitnesss[mejorIdx];
      const mejorIndividuo = poblacion[mejorIdx];
      
      if (mejorFitness < 10) { // Umbral de satisfacción
        console.log(`Generación ${gen}: Solución encontrada con fitness ${mejorFitness}`);
        return { individuo: mejorIndividuo, fitness: mejorFitness, generacion: gen };
      }
      
      // 3. Selección
      const padres = this.seleccionTorneo(poblacion, fitnesss);
      
      // 4. Crossover y creación de hijos
      const hijos = [];
      for (let i = 0; i < this.tamPoblacion; i += 2) {
        const p1 = padres[i];
        const p2 = padres[i + 1] || padres[0];
        
        if (Math.random() < this.probCrossover) {
          const [h1, h2] = this.crossover(p1, p2);
          hijos.push(h1, h2);
        } else {
          hijos.push(p1, p2);
        }
      }
      
      // 5. Mutación
      const hijosMutados = hijos.map(h => this.mutar(h));
      
      // 6. Reemplazo generacional con elitismo
      // Ordenar por fitness
      const indicesOrdenados = [...poblacion.keys()].sort((a, b) => fitnesss[a] - fitnesss[b]);
      const mejoresPadres = indicesOrdenados.slice(0, this.elitismo).map(i => poblacion[i]);
      const mejoresHijos = fitnesss.sort().slice(0, this.elitismo).map(i => hijosMutados[i]);
      
      poblacion = [...mejoresHijos, ...mejoresPadres];
    }
    
    // Devolver la mejor solución encontrada
    const fitnesssFinal = poblacion.map(ind => this.calcularFitness(ind));
    const mejorIdx = fitnesssFinal.indexOf(Math.min(...fitnesssFinal));
    return { individuo: poblacion[mejorIdx], fitness: fitnesssFinal[mejorIdx] };
  }
}

module.exports = CaloricoAG;
```

### Integración con la API existente

Para conectar con el proyecto kinesia-api:

1. **Nueva ruta AG**: `POST /api/ag/calorico`
   - Body: `{ peso, altura, objetivo, alimentos_disponibles }`
   - Response: `{ mejorDistribucion, fitness, generaciones }`

2. **Endpoints sugeridos**:
   ```javascript
   // En src/routes/ag.js nuevo archivo
   router.post('/', async (req, res) => {
     const { peso, altura, objetivo, alimentos } = req.body;
     
     // Calcular calorías objetivo basado en peso, altura y objetivo
     const caloriasObjetivo = calcularCaloriasObjetivo(peso, altura, objetivo);
     
     // Ejecutar AG
     const ag = new CaloricoAG(alimentos, {
       caloriasObjetivoDiarias: caloriasObjetivo,
       objetivo
     });
     
     const resultado = await ag.ejecutar();
     res.json(resultado);
   });
   ```

3. **Almacenamiento de resultados**:
   - Guardar la mejor distribución en la base de datos (tabla `ag_resultados`)
   - Relacionar con usuario: `UsuarioId → AgResultados`

## 4. Herramientas sugeridas para compatibilidad

### Dependencias Node.js recomendadas

1. **`pg`** - Para conexión directa con PostgreSQL (igual que en functions/)
   - Ya usado en `functions/estadisticas.js`
   - Ligero y compatible con Azure Functions

2. **`express`** - Ya en las dependencias del proyecto
   - Usar en una ruta dedicada al AG

3. **Opcional: `sequelize`** - Si se prefiere ORM sobre consultas directas
   - Ya en el proyecto, pero `pg` es más ligero para esta tarea

4. **Estructura de carpetas sugerida**:
   ```
   genetico/
   ├── AG.js          # Implementación principal del algoritmo
   └── index.js       # Punto de entrada con rutas Express
   ```

### Consideraciones de despliegue en Azure

1. **Azure App Service** (Web App):
   - El AG se puede ejecutar como ruta API dentro del mismo servicio
   - No requiere recursos adicionales siempre que los datos estén en la BD

2. **Azure Functions** (recomendado para AG intensivo):
   - El algoritmo puede ser pesado; Functions permite ejecución bajo demanda
   - Usar el patrón ya establecido en `functions/estadisticas.js`
   - Ventaja: escalado automático, no afecta la API principal

3. **Variables de entorno**:
   - `AG_POBLACTION`, `AG_MAX_GENERATIONS`, etc. podrían configurarse aquí

### Validación y testing

1. **Tests unitarios** para:
   - `calcularFitness()` con casos extremos
   - `inicializarPoblacion()` asegurando restricciones básicas
   - Operadores de crossover y mutación

2. **Test de integración** con la API:
   - Enviar datos de prueba con diferentes combinaciones de peso/altura/objetivo
   - Verificar que los resultados se guarden correctamente en PostgreSQL

## 5. Consideraciones adicionales

### Relación con datos de `contenido_calorico`

Una vez que el archivo `contenido_calorico` tenga datos, estos deben proporcionarse en el formato:

```json
[
  { "id": 1, "nombre": "Pollo", "calorias": 165, "protein": 31 },
  { "id": 2, "nombre": "Arroz", "calorias": 130, "protein": 2.7 },
  { "id": 3, "nombre": "Frijoles", "calorias": 127, "protein": 8.9 },
  // ... más alimentos
]
```

### Parámetros por tipo de objetivo

| Parámetro | `cut` | `bulk` |
|-----------|-------|--------|
| **Calorías diarias objetivo** | Peso × 25-30 kcal | Peso × 35-45 kcal |
| **Mínimo por comida** | 200-300 kcal | 400-600 kcal |
| **Máximo por comida** | 400-500 kcal | 700-900 kcal |
| **Distribución** | 5 comidas más pequeñas | 5 comidas más grandes |

### Mejora continua del AG

1. **Parámetros adaptativos**: Ajustar `probMutacion` y `probCrossover` dinámicamente según la convergencia
2. **Elitismo progresivo**: Reducir elitismo con el tiempo para permitir más exploración
3. **Multi-objetivo**: Considerar no solo calorías, sino también balance de macronutrientes
4. **Restricciones por día**: Asegurar que la suma total no exceda las calorías diarias permitidas

### Línea de tiempo sugerida para implementación

1. **Semana 1**: Crear la estructura del algoritmo y validar con datos estáticos
2. **Semana 2**: Integrar con la API y conectar con la base de datos de usuarios
3. **Semana 3**: Probar con datos reales del archivo `contenido_calorico` y ajustar parámetros
4. **Semana 4**: Desplegar en Azure y validar end-to-end