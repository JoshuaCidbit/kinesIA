import numpy as np
import pandas as pd

def crear_poblacion(num_variables, tam_poblacion, rango):
    return np.random.uniform(rango[0], rango[1], (tam_poblacion, num_variables))

def funcion_fitness(poblacion):
    # EJ: ecuacion de esfera (cambiala para la funcion objetivo que quieres)
    return np.sum(poblacion ** 2, axis=1)

def torneo_binario(padres, fitness_padres):
    tam_poblacion = len(padres)
    ganadores = []
    
    for _ in range(tam_poblacion):
        # Seleccionar dos índices al azar
        idx1, idx2 = np.random.choice(tam_poblacion, 2, replace=False)
        
        # Comparar su fitness y conservar el mejor
        if fitness_padres[idx1] < fitness_padres[idx2]:
            ganadores.append(padres[idx1])
        else:
            ganadores.append(padres[idx2])
            
    return np.array(ganadores)

def crossover(padres, prob_crossover):
    tam_poblacion, num_vars = padres.shape
    hijos = []
    
    for i in range(0, tam_poblacion, 2):
        p1 = padres[i]
        p2 = padres[i+1] if i + 1 < tam_poblacion else padres[0]
        
        # Aplicar crossover según la probabilidad
        if np.random.rand() < prob_crossover:
            alpha = np.random.rand()
            hijo1 = alpha * p1 + (1 - alpha) * p2
            hijo2 = alpha * p2 + (1 - alpha) * p1
            hijos.append(hijo1)
            hijos.append(hijo2)
        else:
            hijos.append(p1)
            hijos.append(p2)
            
    return np.array(hijos)

def mutacion(hijos, prob_mutacion, rango):
    hijos_mutados = hijos.copy()
    tam_poblacion, num_vars = hijos.shape
    
    for i in range(tam_poblacion):
        for j in range(num_vars):
            if np.random.rand() < prob_mutacion:
                # Asignar un nuevo valor al azar dentro del rango
                hijos_mutados[i, j] = np.random.uniform(rango[0], rango[1])
                
    return hijos_mutados

def reemplazo_generacional(padres, fitness_padres, hijos, fitness_hijos, elitismo):
    if elitismo > 0:
        # Ordenar padres de menor a mejor fitness
        idx_padres = np.argsort(fitness_padres)
        padres_ordenados = padres[idx_padres]
        
        # Ordenar hijos de menor a mejor fitness
        idx_hijos = np.argsort(fitness_hijos)
        hijos_ordenados = hijos[idx_hijos]
        
        # Combinar los mejores hijos con los mejores padres (elitismo)
        mejores_hijos = hijos_ordenados[:-elitismo]
        mejores_padres = padres_ordenados[:elitismo]
        
        return np.vstack((mejores_hijos, mejores_padres))
    else:
        return hijos

# Parámetros del algoritmo
tam_poblacion = 50
num_variables = 3
rango = (-5.12, 5.12)
generaciones = 100
prob_crossover = 0.9
prob_mutacion = 0.1
elitismo = 5

# Inicialización
poblacion = crear_poblacion(num_variables, tam_poblacion, rango)

for gen in range(generaciones):
    fitness_padres = funcion_fitness(poblacion)
    
    # 1. Selección (Torneo)
    padres_seleccionados = torneo_binario(poblacion, fitness_padres)
    
    # 2. Crossover
    hijos = crossover(padres_seleccionados, prob_crossover)
    
    # 3. Mutación
    hijos = mutacion(hijos, prob_mutacion, rango)
    
    # 4. Evaluar hijos
    fitness_hijos = funcion_fitness(hijos)
    
    # 5. Reemplazo Generacional / Elitismo
    poblacion = reemplazo_generacional(poblacion, fitness_padres, hijos, fitness_hijos, elitismo)

# Mejor solución encontrada
mejor_idx = np.argmin(funcion_fitness(poblacion))
print("Mejor solución encontrada:", poblaciones_final := poblacion[mejor_idx])