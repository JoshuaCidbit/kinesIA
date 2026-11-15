# KinesIA

Aplicación de **rehabilitación física con análisis de movimiento** y **planes calóricos personalizados** mediante Algoritmo Genético. Los pacientes registran sesiones de ejercicios evaluadas con visión computacional; la API genera planes de alimentación (cut/bulk) a partir del catálogo de alimentos.

## Arquitectura

```
kinesia-front (React 19 + Vite)  ->  kinesia-api (Express/Sequelize)  ->  PostgreSQL (Azure)
        |                                   |                                 +
        |                                   |                                 |
        +-> Azure Static Web Apps      +-> Azure Blob Storage (fotos)         |
        |                                   |                                 |
        |                                   +-> Azure Functions (estadisticas) -+
```

- **kinesia-front**: SPA en React 19 + TypeScript + Vite. Consume la API REST mediante `fetch` (cliente en `src/lib/api.ts`) y TanStack Query (`src/lib/queries.ts`). Usa React Router (`src/App.tsx`) con code splitting por vista. En desarrollo llama directamente a `VITE_API_URL` (la API permite ese origen vía `CORS_ORIGIN`).
- **kinesia-api**: API REST en Node/Express 5 con Sequelize sobre **PostgreSQL Flexible Server** en Azure. Incluye autenticación JWT, autorización por rol (paciente/coach/admin), rate limit en login y subida de archivos (fotos/videos) a Blob Storage.
- **AG calórico**: implementación en `kinesia-api/src/ag/` (calorías objetivo, distribución de comidas, restricciones), consumida por el frontend para el plan calórico.
- **kinesia-api/functions**: Azure Functions (Node) con el endpoint HTTP de **estadísticas**; la API lo expone como proxy (`/api/estadisticas/:usuarioId`) para no revelar la URL de la Function.

## Estructura del repositorio

```
.github/workflows/            CI/CD: deploy de la API (App Service) y del front (Static Web Apps)
kinesia-api/
  src/                        app, rutas, controladores, modelos Sequelize, AG, middlewares
  scripts/                    start-local (pg-mem), seed de alimentos, crear-admin
  data/alimentos.json         catálogo de alimentos usado por el seed
  tests/                      pruebas con node --test (pg-mem) y smoke tests
  functions/                  Azure Functions (estadísticas)
kinesia-front/
  src/pages/                  Dashboard, Pacientes, Perfil, Rutinas, MiPanel, Login
  src/components/             UI compartida y formularios
  src/lib/                    cliente HTTP, hooks TanStack Query, tipos, utilidades
  src/contexts/               Auth y tema
  public/                     favicon y staticwebapp.config.json
```

## Requisitos

- **kinesia-front**: Node >= 20.19
- **kinesia-api**: Node >= 22
- PostgreSQL (Azure Flexible Server en producción; en local se usa **pg-mem** en memoria)
- Opcional: [Azure Functions Core Tools](https://learn.microsoft.com/azure/azure-functions/functions-run-local) para ejecutar `kinesia-api/functions` en local

## Ejecución local

### API (local con pg-mem)

```bash
cd kinesia-api
npm install
cp .env.example .env
# JWT_SECRET es obligatorio: genera uno propio de >= 32 caracteres y pégalo en .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npm run start:local      # API en :3000 con PostgreSQL en memoria + catálogo cargado
# o: npm run dev:local    (con nodemon)
```

`start:local` usa pg-mem: crea las tablas y carga `data/alimentos.json` en cada arranque (los datos se pierden al detener el proceso). Para PostgreSQL real: `npm start` con `DATABASE_URL` y `DB_SYNC=true` la primera vez.

Crear un administrador:

```bash
npm run crear-admin <email> <password> [nombre]
```

### Frontend

```bash
cd kinesia-front
npm install
npm run dev              # http://localhost:5173
```

### Azure Functions (opcional)

```bash
cd kinesia-api/functions
npm install
cp local.settings.json.example local.settings.json   # ajustar DATABASE_URL
func start
```

La API consume la Function si defines `FUNCTIONS_URL` (y opcionalmente `FUNCTIONS_KEY`).

## Variables de entorno

### API (`kinesia-api/.env`)

| Variable | Descripción | Default / ejemplo |
|---|---|---|
| `DATABASE_URL` | Cadena de conexión PostgreSQL. | `postgresql://user:pass@servidor:5432/postgres` |
| `DB_SSL` | SSL en la BD (`false` solo para PostgreSQL local). | `true` |
| `DB_SSL_REJECT_UNAUTHORIZED` | Validación del certificado raíz SSL. | `true` |
| `AZURE_STORAGE_CONNECTION_STRING` | Cadena de conexión del Blob Storage. | `DefaultEndpointsProtocol=...` |
| `AZURE_STORAGE_CONTAINER` | Contenedor de medios. | `kinesia-media` |
| `PORT` | Puerto del servidor. | `3000` |
| `DB_SYNC` | `true` para `sync({alter:true})` en BD real (solo la primera vez o al cambiar modelos). | desactivado |
| `USE_PG_MEM` | `true` para usar PostgreSQL en memoria (demo local). | `false` |
| `SEED_ALIMENTOS` | Cargar `data/alimentos.json` al arrancar. | `false` (siempre en pg-mem) |
| `CORS_ORIGIN` | Orígenes permitidos (frontend), separados por coma. | `http://localhost:5173` |
| `FUNCTIONS_URL` | URL de la Azure Function (proxy de estadísticas). | — |
| `FUNCTIONS_KEY` | Key de la Azure Function (opcional). | — |
| `JWT_SECRET` | **Obligatorio**: secreto JWT de >= 32 caracteres, distinto del valor de ejemplo. | — |
| `JWT_EXPIRES_IN` | Expiración del token. | `8h` |

> **SSL en Azure**: Azure Database for PostgreSQL exige SSL. Si el arranque falla por el certificado raíz, añade el certificado de Azure al bundle del sistema o configura `DB_SSL_REJECT_UNAUTHORIZED=false`.

### Frontend

`.env.development` → `VITE_API_URL=http://localhost:3000`
`.env.production` → `VITE_API_URL=https://<tu-app>.azurewebsites.net`

## API REST

Todas las rutas requieren `Authorization: Bearer <token>` salvo `/api/health` y `/api/usuarios/login`.

| Recurso | Endpoints principales | Rol |
|---|---|---|
| Salud | `GET /api/health` | público |
| Auth | `POST /api/usuarios/login`, `GET /api/usuarios/me`, `PUT /api/usuarios/me/password` | público / autenticado |
| Usuarios | `GET/POST /api/usuarios`, `GET/PUT/DELETE /api/usuarios/:id`, `POST /api/usuarios/:id/foto` | coach/admin (paciente: solo su ámbito) |
| Admin | `GET /api/usuarios/coaches`, `PUT /api/usuarios/:id/coach`, `PUT /api/usuarios/:id/rol`, `PUT /api/usuarios/:id/password` | admin |
| Rutinas | `GET/POST /api/rutinas`, `GET/PUT/DELETE /api/rutinas/:id`, `POST /api/rutinas/:id/media` | lectura autenticado; escritura coach/admin |
| Sesiones | `GET/POST /api/sesiones`, `GET /api/sesiones/usuario/:usuarioId`, `GET/PUT/DELETE /api/sesiones/:id` | coach/admin (paciente: propias) |
| Alimentos | `GET /api/alimentos`, escritura `POST/PUT/DELETE` | lectura autenticado; escritura coach/admin |
| AG calórico | `GET/POST /api/ag/calorico`, `GET /api/ag/usuario/:usuarioId`, `GET /api/ag/resultados/:id` | autenticado (acceso por paciente) |
| Estadísticas | `GET /api/estadisticas/:usuarioId` (proxy a Azure Functions) | autenticado (acceso por paciente) |

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
| `npm run build` | Type-check (`tsc --noEmit`) + build de producción. |
| `npm run lint` | Linter (ESLint 9 + typescript-eslint). |
| `npm run lint:fix` | Linter con corrección automática. |
| `npm run preview` | Previsualizar build. |
| `npm test` | Tests con Vitest. |
| `npm run test:watch` | Tests en modo watch. |

## Tests

```bash
cd kinesia-api && npm test      # 33 pruebas (AG, auth, usuarios, sesiones, storage)
cd kinesia-front && npm test    # 21 pruebas (componentes, contextos, permisos)
```

## CI/CD y despliegue

Un push a `master` dispara los workflows de `.github/workflows/` (Node 22.x):

| Workflow | Qué hace |
|---|---|
| `azure-webapps-kinesia-api.yml` | Instala con `npm ci`, corre los tests contra PostgreSQL 15 real, poda devDependencies y despliega a Azure App Service. Se ejecuta solo si cambia `kinesia-api/**`. |
| `azure-static-web-apps-polite-stone-018a91b10.yml` | Instala, linta, testea y compila el front; despliega a Azure Static Web Apps. Se ejecuta si cambia `kinesia-front/**`. |

Las credenciales de despliegue viven en los **secrets** del repositorio; no hay secretos en el código.

## Privacidad y datos de salud

KinesIA maneja datos sensibles de salud. Resumen:

- **Datos que se guardan**: nombre, email, edad, foto (Blob Storage), rol (paciente/coach/admin), coach asignado, hash de contraseña (bcrypt), historial de sesiones (fecha, repeticiones, precisión, observaciones), resultados de planes calóricos (peso, objetivo, distribución, fitness) y el catálogo de alimentos.
- **Acceso**: solo el rol correspondiente (paciente, su coach, admin) sobre los datos de su ámbito; los pacientes solo acceden a sus propios datos.
- **Eliminación**: al eliminar un usuario se borran sus sesiones y resultados (CASCADE); la foto se elimina del Blob Storage.

Ver [PRIVACY.md](./PRIVACY.md) para el borrador de política.
