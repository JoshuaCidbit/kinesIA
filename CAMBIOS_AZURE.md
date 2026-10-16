# KinesIA — Migración a Azure
### Cambios y guía de despliegue (App Service + PostgreSQL Flexible Server + Blob Storage + Azure Functions)

---

## 1. Resumen de cambios

| Requisito | Antes (versión Supabase/Render/Vercel) | Ahora (Azure) |
|---|---|---|
| API REST (19 rutas) | Render | **Azure App Service** (Web App, Node 20) |
| Base de datos en la nube | Supabase PostgreSQL | **Azure Database for PostgreSQL – Flexible Server** |
| Servicio de almacenamiento | Supabase Storage | **Azure Blob Storage** (contenedor `kinesia-media`) |
| API serverless (1 ruta) | Vercel Function | **Azure Functions** (HTTP trigger, modelo v4) |

### Archivos modificados / nuevos

| Archivo | Cambio |
|---|---|
| `package.json` | Se quita `@supabase/supabase-js`; se agrega `@azure/storage-blob` |
| `src/services/storage.service.js` | Reescrito para Azure Blob (`uploadData`, `deleteIfExists`) |
| `src/config/database.js` | SSL controlado por `DB_SSL` (Azure exige SSL; `false` solo para pruebas locales) |
| `src/models/*.js` | Nombres de tabla explícitos: `usuarios`, `rutinas`, `sesiones_terapia` |
| `src/middlewares/upload.js`, `src/utils/helpers.js` | Mensaje de error claro (400) al subir un archivo no permitido |
| `.env.example` | Variables de Azure (`AZURE_STORAGE_CONNECTION_STRING`, `AZURE_STORAGE_CONTAINER`, `DB_SSL`) |
| `functions/` (**nuevo**) | Proyecto independiente de Azure Functions con `estadisticas.js`, `host.json`, `package.json` |
| Eliminados | `render.yaml`, `vercel.json`, carpeta `api/` |

**Sin cambios:** modelos, controladores, rutas, validaciones y las 19 rutas de la API. El código del CRUD es el mismo.

### Por qué la función usa SQL directo (`pg`) y no Sequelize
`functions/` se despliega como una Function App **independiente**, así que no puede importar `../src/models`. Usar `pg` directamente la hace ligera y rápida en arranque en frío. Por eso se fijaron los nombres de tabla en los modelos: la función consulta `usuarios` y `sesiones_terapia`.

### Qué se probó localmente
- Las 19 rutas de la API contra un PostgreSQL real (`tests/smoke.sh`): todas responden con el código esperado (200/201/400/404/409).
- Subir, reemplazar y borrar archivos en Blob Storage con el emulador **Azurite**: la URL pública responde 200, y el blob viejo se elimina al reemplazar o al borrar el registro.
- La función `estadisticas`: casos 200, 404 (usuario inexistente) y 400 (ID inválido).

**No se probó** contra su suscripción real de Azure (firewall, SSL, permisos de región). La sección 6 lista los errores típicos.

---

## 2. Antes de empezar

1. Crear la cuenta en **https://azure.microsoft.com/free/students** con el correo `@uaq.mx`.
   **No** actives antes la prueba gratuita de 30 días con ese correo: después ya no podrás activar Azure for Students.
2. Usa **la misma región** para todos los recursos (ej. *East US 2* o *Central US*). Si PostgreSQL te marca "región no disponible" para tu suscripción, prueba otra región y crea todo ahí.
3. Instalar (opcional según el método): VS Code + extensión **Azure Tools**, o **Azure CLI**, y **Azure Functions Core Tools** (`func`).
4. Subir el proyecto a GitHub (el `.env` y `local.settings.json` ya están en `.gitignore`).

Nombres sugeridos (cámbialos por algo único, los de Web App, Function App y Storage son globales):

| Recurso | Nombre |
|---|---|
| Grupo de recursos | `rg-kinesia` |
| PostgreSQL | `kinesia-pg-<iniciales>` |
| Storage account | `kinesiastorage<iniciales>` (solo minúsculas y números, 3-24 caracteres) |
| Web App | `kinesia-api-<iniciales>` |
| Function App | `kinesia-func-<iniciales>` |

---

## 3. Paso a paso (Portal de Azure)

### Paso 1 — Grupo de recursos
Portal → **Resource groups → Create** → `rg-kinesia` → región elegida.

### Paso 2 — Base de datos: PostgreSQL Flexible Server
1. **Create a resource → Azure Database for PostgreSQL flexible server**.
2. Resource group `rg-kinesia`, nombre del servidor, misma región, versión **16**.
3. Workload / Compute: **Burstable, Standard_B1ms** (el más barato).
4. Authentication: **PostgreSQL authentication**. Usuario `adminkinesia` y una contraseña. **Guárdalas.**
5. Pestaña **Networking**:
   - Connectivity method: **Public access**.
   - Marcar **Allow public access from any Azure service within Azure to this server** (permite que la Web App y la Function se conecten).
   - Marcar **Add current client IP address** (para que puedas conectarte desde tu PC).
6. Crear y esperar a que termine.
7. Armar la cadena de conexión:
   ```
   postgresql://adminkinesia:TU_PASSWORD@kinesia-pg-xx.postgres.database.azure.com:5432/postgres
   ```
   Si la contraseña tiene caracteres especiales, codifícalos (`@` → `%40`, `#` → `%23`, `/` → `%2F`, `:` → `%3A`). No agregues `?sslmode=...`; el código ya activa SSL.

### Paso 3 — Storage: Blob Storage
1. **Create a resource → Storage account**: Performance **Standard**, Redundancy **LRS** (el más barato), misma región.
2. Al terminar: **Settings → Configuration → Allow Blob anonymous access → Enabled → Save**.
   (Está desactivado por defecto; sin esto las URLs públicas de las fotos no abren.)
3. **Data storage → Containers → + Container**: nombre `kinesia-media`, **Public access level: Blob (anonymous read access for blobs only)**.
4. **Security + networking → Access keys → Show → Connection string** (de key1). Cópiala: es `AZURE_STORAGE_CONNECTION_STRING`.

> Alternativa sin acceso público: dejar el contenedor privado y devolver URLs con SAS. Requiere modificar el servicio de storage; la opción pública es la más simple para esta entrega.

### Paso 4 — API REST: App Service (Web App)
1. **Create a resource → Web App**.
   - Publish: **Code** · Runtime stack: **Node 20 LTS** · Operating System: **Linux** · misma región.
   - Pricing plan: **Free F1** si lo ofrece (gratis, pero con cuota de CPU y se duerme), o **Basic B1** (consume crédito, más estable).
2. Cuando se cree: **Settings → Environment variables → App settings → + Add** (en portales anteriores: *Configuration*). Agregar:

   | Nombre | Valor |
   |---|---|
   | `DATABASE_URL` | la cadena del Paso 2 |
   | `DB_SSL` | `true` |
   | `AZURE_STORAGE_CONNECTION_STRING` | la cadena del Paso 3 |
   | `AZURE_STORAGE_CONTAINER` | `kinesia-media` |
   | `DB_SYNC` | `true` (solo el primer arranque) |

   Guardar (la app se reinicia). **No** definas `PORT`: App Service lo asigna y el código ya lo lee.
3. **Deployment Center** → Source: **GitHub** → elegir repositorio y rama → Save. Azure construye (`npm install`) y despliega; en cada `git push` se vuelve a desplegar.
   *Alternativa:* VS Code → extensión Azure → clic derecho en la Web App → **Deploy to Web App** (carpeta raíz del proyecto).
4. Probar: `https://<tu-webapp>.azurewebsites.net/api/health` debe responder `{"status":"ok","db":"conectada",...}`.
5. Cuando ya existan las tablas, cambiar `DB_SYNC` a `false` y guardar.
6. (Opcional) **Monitoring → Health check** → ruta `/api/health`.

### Paso 5 — Serverless: Azure Functions
1. **Create a resource → Function App**.
   - Hosting: **Flex Consumption** (o **Consumption** si no aparece/no te deja) · Runtime **Node.js 20** · misma región · Linux.
   - Storage account: crea una nueva para la función (la que pide Azure para su funcionamiento interno).
2. Cuando se cree: **Settings → Environment variables → App settings**:

   | Nombre | Valor |
   |---|---|
   | `DATABASE_URL` | la misma cadena de PostgreSQL |
   | `DB_SSL` | `true` |

3. Desplegar **solo la carpeta `functions/`**:
   ```bash
   cd functions
   npm install
   func azure functionapp publish <nombre-de-tu-function-app>
   ```
   (Requiere `az login` previo.) *Alternativa:* VS Code → Azure → Function App → **Deploy to Function App** eligiendo la carpeta `functions`.
4. Probar: `https://<tu-function-app>.azurewebsites.net/api/estadisticas/1`
   Debe devolver las métricas del usuario 1 (necesita que ya existan usuario y sesiones).

---

## 4. Alternativa: Azure CLI (opcional)

Resumen equivalente a los pasos 1-4 (ajusta nombres y región). Para la Function, usa el portal o revisa `az functionapp create --help` según tu versión de CLI.

```bash
az login
az group create -n rg-kinesia -l eastus2

# PostgreSQL (0.0.0.0 = permitir servicios de Azure)
az postgres flexible-server create -g rg-kinesia -n kinesia-pg-xx -l eastus2 \
  --admin-user adminkinesia --admin-password 'TU_PASSWORD' \
  --tier Burstable --sku-name Standard_B1ms --version 16 --storage-size 32 \
  --public-access 0.0.0.0

# Storage + contenedor público
az storage account create -g rg-kinesia -n kinesiastoragexx -l eastus2 \
  --sku Standard_LRS --allow-blob-public-access true
az storage container create --account-name kinesiastoragexx -n kinesia-media --public-access blob

# Web App (desde la raíz del proyecto)
az webapp up -g rg-kinesia -n kinesia-api-xx -l eastus2 --runtime "NODE:20-lts" --sku F1
az webapp config appsettings set -g rg-kinesia -n kinesia-api-xx --settings \
  DATABASE_URL='postgresql://...' DB_SSL=true DB_SYNC=true \
  AZURE_STORAGE_CONNECTION_STRING='...' AZURE_STORAGE_CONTAINER=kinesia-media
```

---

## 5. Pruebas de rutas

Con la API desplegada, corre desde tu computadora (Git Bash / WSL / Linux / macOS):

```bash
BASE_URL=https://<tu-webapp>.azurewebsites.net \
SERVERLESS_URL=https://<tu-function-app>.azurewebsites.net \
FOTO=./foto.jpg bash tests/smoke.sh
```

El script recorre las 19 rutas, la subida a Blob Storage, los errores esperados (404, 400, 409), la función serverless y limpia los datos al final.

### Capturas sugeridas para la entrega
1. Portal de Azure: **grupo `rg-kinesia`** con todos los recursos creados.
2. PostgreSQL: **Overview** del servidor (estado *Ready*) y las tablas (con Azure Data Studio, DBeaver o `psql`).
3. Storage account → contenedor `kinesia-media` con archivos subidos.
4. Web App: **Overview** con la URL y estado *Running*, y `/api/health` en el navegador.
5. Salida de `tests/smoke.sh` contra la URL de Azure.
6. Function App → función `estadisticas` y respuesta de `/api/estadisticas/1`.
7. (Opcional) Function App → **Monitor / Invocations** mostrando la ejecución.

### Endpoints (sin cambios)

| Recurso | Rutas |
|---|---|
| Sistema (1) | `GET /api/health` |
| Usuarios (6) | `POST /api/usuarios` · `GET /api/usuarios` · `GET /api/usuarios/:id` · `PUT /api/usuarios/:id` · `DELETE /api/usuarios/:id` · `POST /api/usuarios/:id/foto` (Blob) |
| Rutinas (6) | `POST /api/rutinas` · `GET /api/rutinas` · `GET /api/rutinas/:id` · `PUT /api/rutinas/:id` · `DELETE /api/rutinas/:id` · `POST /api/rutinas/:id/media` (Blob) |
| Sesiones (6) | `POST /api/sesiones` · `GET /api/sesiones` · `GET /api/sesiones/:id` · `GET /api/sesiones/usuario/:usuarioId` · `PUT /api/sesiones/:id` · `DELETE /api/sesiones/:id` |
| **Total App Service** | **19 rutas** (mínimo 12) |
| Azure Functions (1) | `GET /api/estadisticas/{usuarioId}` |

Las reglas de integridad siguen igual: borrar un usuario borra su historial (CASCADE); una rutina con sesiones no se puede borrar (409).

---

## 6. Problemas comunes

| Síntoma | Causa probable | Solución |
|---|---|---|
| `/api/health` da 503 o la app no arranca; en el log aparece timeout / `ECONNREFUSED` | Firewall de PostgreSQL | Servidor PG → **Networking** → marcar *Allow public access from any Azure service* |
| `no pg_hba.conf entry ... no encryption` | SSL desactivado | `DB_SSL=true` en App settings |
| `password authentication failed` | Contraseña mal escrita o sin codificar | Revisa caracteres especiales en la URL (`%40`, etc.) |
| Subir foto da 500 y el log dice `AuthorizationFailure` / `PublicAccessNotPermitted` | Acceso anónimo desactivado en la Storage account | Paso 3.2 y nivel *Blob* del contenedor |
| La foto se sube pero la URL da 404 / `ResourceNotFound` | El contenedor no existe o tiene otro nombre | Crear `kinesia-media` o ajustar `AZURE_STORAGE_CONTAINER` |
| La función responde 404 | Ruta incorrecta o código no desplegado | Debe ser `/api/estadisticas/1` (con prefijo `/api`); verifica que la función aparezca en *Functions* |
| La función responde 500 | `DATABASE_URL` sin definir o firewall | App settings de la Function App y Networking de PostgreSQL |
| La primera petición tarda mucho | Arranque en frío (plan F1 / Consumption) | Es normal; reintenta |
| "Región no disponible" al crear PostgreSQL o la Function | Restricción de la suscripción de estudiante | Crea el recurso en otra región (y el resto en esa misma) |
| Una tabla no se crea | `DB_SYNC` en `false` | Ponerlo en `true`, reiniciar, y luego regresarlo a `false` |

---

## 7. Costos y cuidado del crédito ($100)

- **PostgreSQL B1ms** y **App Service B1** consumen crédito de forma continua, aunque no los uses. Revisa el costo estimado en la calculadora de precios de Azure antes de crearlos.
- Ahorra: **detén el servidor PostgreSQL** cuando no lo uses (Overview → *Stop*; Azure lo reinicia solo después de unos días), y usa **F1** en App Service si te alcanza.
- Crea una alerta de presupuesto: **Cost Management → Budgets**.
- Al terminar la evaluación, elimina todo de una vez: **Resource groups → `rg-kinesia` → Delete resource group**.

---

## 8. Checklist de la entrega

- [ ] Grupo de recursos con PostgreSQL, Storage, Web App y Function App
- [ ] API en Azure App Service con 19 rutas funcionando (CRUD de las 3 tablas)
- [ ] Base de datos en la nube (Azure PostgreSQL) con las tres tablas
- [ ] Servicio de almacenamiento (Blob Storage) con archivos subidos desde la API
- [ ] 1 ruta serverless (Azure Functions) funcionando
- [ ] Capturas de la sección 5 y salida de `smoke.sh`

URL API: `https://________________.azurewebsites.net`
URL Función: `https://________________.azurewebsites.net/api/estadisticas/:usuarioId`
Repositorio: `https://github.com/________________`
