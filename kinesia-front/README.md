# KinesIA Frontend

Conecta el frontend de React con la API REST de KinesIA (Azure App Service) y Azure Functions.

## Características principales

- **Cliente HTTP** (`src/lib/api.js`): Utiliza `fetch` del navegador para llamar a la API.
- **Cliente de consultas** (`src/lib/queries.js`): TanStack Query v5 con mutaciones, queries y gestión de caché.
- **Proveedor** (`src/main.jsx`): Envuelve toda la aplicación con QueryClientProvider.
- **Ejemplo de uso** (`src/App.jsx`): Componente de ejemplo con prácticas recomendadas.

## Configuración del entorno

`.env.development`
```
VITE_API_URL=http://localhost:3000
```

`.env.production`
```
VITE_API_URL=https://kinesia-api-xxxxx.azurewebsites.net
```

## Ejecutar localmente

```bash
cd kinesia-front
pnpm install
pnpm dev
```

## Uso

```jsx
import { useUsuarios, useCrearSesion } from './src/lib/queries';

// Leer datos
const { data, isLoading, error } = useUsuarios();

// Escribir datos
const crear = useCrearSesion();
crear.mutate({ usuarioId: 1, rutinaId: 2, ... }, {
  onError: (e) => console.error(e.message)
});
```

## Estructuras de datos reales

- **Usuario**: `{ id, nombre, email, edad, fotoUrl, fotoPath }`
- **Rutina**: `{ id, nombre, descripcion, anguloObjetivo, mediaUrl }`
- **Sesión**: `{ id, fecha, repeticiones, precisionPromedio, observaciones, usuarioId, rutinaId, Usuario, Rutina }`
- **Estadísticas**: `{ usuarioId, totalSesiones, promedioPrecision, ultimaSesion, rutinaMasUsada }`
- **Errores**: `{ error: "..." }`

## Comprobar la conexión

```bash
# API de health
curl -i https://kinesia-api-xxxxx.azurewebsites.net/api/health

# Usuarios (CORS preflight)
curl -i -H "Origin: http://localhost:5173" https://kinesia-api-xxxxx.azurewebsites.net/api/usuarios

# Estadísticas (después del proxy)
curl -i https://kinesia-api-xxxxx.azurewebsites.net/api/estadisticas/1
```

## Notas de implementación

- El proxy `/api/estadisticas/:usuarioId` en Express oculta la URL de Azure Functions.
- `api.js` exporta clientes HTTP (`usuarios`, `rutinas`, `sesiones`, `sistema`).
- `queries.js` expone hooks (`useUsuarios`, `useCrearSesion`, etc.).
- El proxy espera `FUNCTIONS_URL` y opcionalmente `FUNCTIONS_KEY` desde las variables de entorno de App Service.