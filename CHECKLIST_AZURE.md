# Checklist pre-deploy a Azure (KinesIA)

Lista de verificación antes de commitear y desplegar a Azure. Marcar cada punto.

## 1. Estado local del repositorio

- [ ] `cd kinesia-api && npm test` → **21/21 pruebas pasan** (node --test, pg-mem).
- [ ] `cd kinesia-front && npm test` → **10/10 pruebas pasan** (Vitest).
- [ ] `cd kinesia-front && npm run build` → build OK.
- [ ] `git status` limpio (todo commiteado).
- [ ] `git ls-files | grep -i env` → solo `.env.example` (y `.env.development` / `.env.production` sin secretos).
- [ ] `git log --all --diff-filter=A -- '.env' '*.env'` → sin resultados (nunca se subió un .env real).

## 2. Variables de entorno en Azure App Service (kinesia-api)

- [ ] `JWT_SECRET`: valor real configurado, **≥ 32 caracteres**, distinto del valor de ejemplo. Si no, la API no arranca tras el deploy.
- [ ] `JWT_EXPIRES_IN=8h`.
- [ ] `DATABASE_URL`: cadena del PostgreSQL Flexible Server válida.
- [ ] `DB_SSL=true`.
- [ ] `DB_SSL_REJECT_UNAUTHORIZED=true` (por defecto). Si falla la conexión por certificado raíz, probar en staging o temporalmente `false` mientras se configura el certificado.
- [ ] `AZURE_STORAGE_CONNECTION_STRING` y `AZURE_STORAGE_CONTAINER=kinesia-media`.
- [ ] `CORS_ORIGIN`: URL del Static Web App (`https://TU-STATIC-WEB-APP.azurestaticapps.net`).
- [ ] `FUNCTIONS_URL` / `FUNCTIONS_KEY` (si aplica al entorno).

## 3. Base de datos (PostgreSQL Flexible Server)

- [ ] `DB_SYNC=true` (solo para la primera vez o cambios de esquema).
- [ ] SSL habilitado en la conexión.
- [ ] Firewall / VNet del Flexible Server permite al App Service.
- [ ] No se requieren alters peligrosos de esquema en columnas existentes (rol `ENUM` restaurado en producción).

## 4. Storage (Azure Blob)

- [ ] Container `kinesia-media` existe.
- [ ] Connection string con permisos de subida/lectura.

## 5. Post-deploy

- [ ] `GET /api/health` → 200 `{ status: ok, db: conectada }`.
- [ ] Login con cuenta real funciona.
- [ ] Flujo mínimo: crear paciente → rutina → sesión → plan calórico.

## 6. Rollback

- [ ] Tag / versión anterior identificada.
- [ ] Procedimiento de rollback del App Service.
