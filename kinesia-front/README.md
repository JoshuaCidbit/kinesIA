# KinesIA Frontend

Conecta el frontend de React con la API REST de KinesIA (Azure App Service). Las estadísticas se consumen a través del proxy de la API, que llama a Azure Functions.

## Características principales

- **Cliente HTTP** (`src/lib/api.ts`): Utiliza `fetch` del navegador para llamar a la API.
- **Cliente de consultas** (`src/lib/queries.ts`): TanStack Query v5 con mutaciones, queries y gestión de caché.
- **Proveedor** (`src/main.tsx`): Envuelve toda la aplicación con QueryClientProvider.
- **Router** (`src/App.tsx`): rutas con React Router y carga diferida (`React.lazy`) por vista.

## Stack y tooling

- **Lenguaje**: TypeScript (`tsconfig.json`) — todo el código vive en `*.ts` / `*.tsx`.
- **Build**: Vite 8 + `@vitejs/plugin-react` (JSX runtime automático).
- **Linter**: ESLint 9 con `typescript-eslint`, `eslint-plugin-react`, `eslint-plugin-react-hooks` y `eslint-plugin-jsx-a11y` (config en `eslint.config.js`).
- **Tests**: Vitest 5 + Testing Library + jsdom.

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
npm install
npm run dev
```

## Scripts

| Script | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo Vite. |
| `npm run build` | Type-check (`tsc --noEmit`) + build de producción. |
| `npm run lint` | Linter (ESLint). |
| `npm run lint:fix` | Linter con corrección automática. |
| `npm run preview` | Previsualizar build. |
| `npm test` | Tests con Vitest. |
| `npm run test:watch` | Tests en modo watch. |

## Uso

```tsx
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

Definidas en `src/lib/types.ts`:

- **Usuario**: `{ id, nombre, email, rol, fotoUrl?, coachId?, coach?, edad?, createdAt? }`
- **Rutina**: `{ id, nombre, descripcion?, anguloObjetivo? }`
- **Sesión**: `{ id?, usuarioId?, rutinaId?, fecha?, repeticiones?, precisionPromedio?, observaciones?, anguloObjetivo?, Usuario?, Rutina? }`
- **Estadísticas**: `{ usuarioId, totalSesiones, promedioPrecision, ultimaSesion?, rutinaMasUsada? }`
- **Alimento**: `{ id, nombre, categoria?, codigo?, calorias, porciones?, porcionBase?, unidad? }`
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
- `api.ts` exporta clientes HTTP (`usuarios`, `rutinas`, `sesiones`, `alimentos`, `sistema`, `ag`).
- `queries.ts` expone hooks (`useUsuarios`, `useCrearSesion`, etc.).
- El proxy espera `FUNCTIONS_URL` y opcionalmente `FUNCTIONS_KEY` desde las variables de entorno de App Service.
