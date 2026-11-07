# KinesIA

Aplicación de **rehabilitación física con análisis de movimiento** y **planes calóricos personalizados** mediante Algoritmo Genético. Los pacientes registran sesiones de ejercicios evaluadas con visión computacional; la API genera planes de alimentación (cut/bulk) a partir del catálogo de alimentos.

## Arquitectura

```
kinesia-front (React 19 + Vite)  ->  kinesia-api (Express/Sequelize)  ->  PostgreSQL (Azure)
        |                                   |                                 +
        |                                   |                                 |
        +-> Azure Static Web Apps      +-> Azure Blob Storage (fotos)
        |                                   |
        |                                   +-> Azure Functions (estadisticas) -> PostgreSQL
```

- **kinesia-front**: SPA en React 19 + Vite. Consume la API REST mediante `fetch` (cliente en `src/lib/api.js`) y TanStack Query (`src/lib/queries.js`). En desarrollo se proxya `/api` a la API local.
- **kinesia-api**: API REST en Node/Express con Sequelize sobre **PostgreSQL Flexible Server** en Azure. Incluye autenticación JWT, autorización por rol (paciente/coach/admin) y subida de archivos (fotos/videos) a Blob Storage.
- **kinesia-AG**: prototipo/algoritmo genético (calorías objetivo, distribución de comidas, restricciones) usado por la API y consumido por el frontend para el plan calórico.
- **kinesia-api/functions**: Azure Functions (Node) con el endpoint HTTP de **estadísticas**; la API lo usa como proxy (`/api/estadisticas/:usuarioId`).

## Requisitos

- **kinesia-front**: Node >= 20.19
- **kinesia-api**: Node >= 18
- PostgreSQL (Azure Flexible Server en producción; en local se usa **pg-mem** en memoria)

## Ejecución local

### API (local con pg-mem)

```bash
cd kinesia-api
cp .env.example .env     # ajustar si se usa PostgreSQL real
npm run start:local      # API + PostgreSQL en memoria (pg-mem) + seed de alimentos
# o: npm run dev:local    (con nodemon)
npm run seed:alimentos
npm run crear-admin <email> <password> [nombre]
```

### Frontend

```bash
cd kinesia-front
npm install
npm run dev
```

## Variables de entorno

| Variable | Descripción | Default / ejemplo |
|---|---|---|
| `DATABASE_URL` | Cadena de conexión PostgreSQL. | `postgresql://user:pass@servidor:5432/postgres` |
| `DB_SSL` | SSL en la BD (`false` solo para PostgreSQL local). | `true` |
| `DB_SSL_REJECT_UNAUTHORIZED` | Validación del certificado raíz SSL (`true` por defecto). | `true` |
| `AZURE_STORAGE_CONNECTION_STRING` | Cadena de conexión del Blob Storage. | `DefaultEndpointsProtocol=...` |
| `AZURE_STORAGE_CONTAINER` | Contenedor de medios. | `kinesia-media` |
| `PORT` | Puerto del servidor. | `3000` |
| `DB_SYNC` | `true` para `sync({alter:true})` en BD real. | `true` |
| `USE_PG_MEM` | `true` para usar PostgreSQL en memoria (demo local). | `false` |
| `SEED_ALIMENTOS` | Cargar catálogo `data/alimentos.json` al arrancar. | `false` |
| `CORS_ORIGIN` | Orígenes permitidos (frontend), separados por coma. | `http://localhost:5173` |
| `FUNCTIONS_URL` | URL de la Azure Function (proxy de estadísticas). | - |
| `FUNCTIONS_KEY` | Key de la Azure Function (opcional). | - |
| `JWT_SECRET` | Secreto JWT (>= 32 caracteres, no el valor de ejemplo). | - |
| `JWT_EXPIRES_IN` | Expiración del token. | `8h` |

> **SSL en Azure**: Azure Database for PostgreSQL exige SSL. Si el arranque falla por el certificado raíz, descarga el certificado raíz de Azure y configura `DB_SSL_REJECT_UNAUTHORIZED=false` o añade el certificado al bundle del sistema.

## Scripts

### kinesia-api

| Script | Descripción |
|---|---|
| `npm start` | Arranca con `DATABASE_URL` (producción/Azure). |
| `npm run dev` | Arranca con nodemon. |
| `npm run start:local` | Arranca en modo local con pg-mem. |
| `npm run dev:local` | Arranca en modo local con pg-mem + nodemon. |
| `npm run seed:alimentos` | Carga el catálogo de alimentos. |
| `npm run crear-admin` | Crea/restaura un admin. |
| `npm test` | Tests con `node --test` (incluye AG y auth contra pg-mem). |
| `npm run test:ag` | Tests del algoritmo genético. |
| `npm run test:api` | Prueba de integración del flujo API + AG. |
| `npm run smoke:ag` | Smoke test contra API desplegada. |

### kinesia-front

| Script | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo Vite. |
| `npm run build` | Build de producción. |
| `npm run lint` | Linter (oxlint). |
| `npm run preview` | Previsualizar build. |
| `npm test` | Tests con Vitest. |
| `npm run test:watch` | Tests en modo watch. |

### Pruebas

- **API**: `cd kinesia-api && npm test`
- **Frontend**: `cd kinesia-front && npm test`

## Privacidad y datos de salud

KinesIA maneja datos sensibles de salud. Resumen:

- **Datos que se guardan**: nombre, email, edad, foto (Blob Storage), rol (paciente/coach/admin), coach asignado, hash de contraseña (bcrypt), historial de sesiones (fecha, repeticiones, precisión, observaciones), resultados de planes calóricos (peso, objetivo, distribución, fitness) y el catálogo de alimentos.
- **Acceso**: solo el rol correspondiente (paciente, su coach, admin) sobre los datos de su ámbito; los pacientes solo acceden a sus propios datos.
- **Eliminación**: al eliminar un usuario se borran sus sesiones y resultados (CASCADE); la foto se elimina del Blob Storage.

Ver [PRIVACY.md](./PRIVACY.md) para el borrador de política.
