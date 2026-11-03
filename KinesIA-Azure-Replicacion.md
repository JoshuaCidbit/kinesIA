# KinesIA en Azure — Guía de replicación (uso personal)

> Documento para rehacer el despliegue si algo se rompe o se borra.
> **Contiene marcadores `<...>` donde van secretos. No subas este archivo con secretos a un repositorio público.**
> Estado validado: octubre de 2026. `smoke.sh` pasó las 19 rutas y los casos de error (200/201/400/404/409), la subida a Blob y la función serverless.

---

## 1. Arquitectura final

Resource group: **`KinesiaIA`** · Región: **México Central** · Suscripción: Azure for Students

| Componente | Recurso | Detalle |
|---|---|---|
| API REST (19 rutas) | App Service `kinesia-api` | Linux, Node 20, **plan F1 (Free)**, despliegue por **GitHub Actions** |
| Serverless (1 ruta) | Function App `kinesia-func` | **Flex Consumption**, Node.js 20, despliegue con `func publish` |
| Base de datos | PostgreSQL Flexible Server `kinesia-pg` | Host `kinesia-pg.postgres.database.azure.com`, usuario `adminkinesia`, base `postgres` |
| Archivos | Storage account `kinesiastorage` | Contenedor `kinesia-media` (acceso público nivel *Blob*). Es la que usa la API |
| Storage interna | Storage account `kinesiaabc2` | La usa la Function App para su funcionamiento interno. No tocar |
| Monitoreo | Application Insights `kinesia-func` | Creado junto con la Function App |
| Planes | `ASP-KinesIA-804a`, `ASP-KinesIA-9b60` | App Service plans. Revisar cuál es de cada app y su SKU |

Recursos en el grupo: 9 (2 App Service plans, Web App, Function App, Application Insights, Smart Detection action group, PostgreSQL, 2 Storage accounts).

### URLs

| Qué | URL |
|---|---|
| API | `https://kinesia-api-gfbna7fab0gxdjc7.mexicocentral-01.azurewebsites.net` |
| Health | `https://kinesia-api-gfbna7fab0gxdjc7.mexicocentral-01.azurewebsites.net/api/health` |
| Función | `https://kinesia-func-bnb5fweeatc4awds.mexicocentral-01.azurewebsites.net/api/estadisticas/{usuarioId}` |
| Repositorio | `https://github.com/JoshuaCidbit/kinesIA` |
| Foto de ejemplo | `https://kinesiastorage.blob.core.windows.net/kinesia-media/usuarios/<uuid>.jpeg` |

> Las URLs llevan un sufijo aleatorio (`...gfbna7fab0gxdjc7.mexicocentral-01...`). **Usa siempre la URL completa** que aparece en Overview → *Default domain* de cada recurso, no `<nombre>.azurewebsites.net`.

---

## 2. Datos y secretos (llénalos tú)

| Dato | Valor | Dónde se obtiene |
|---|---|---|
| Contraseña de PostgreSQL | `<TU_PASSWORD>` | La definiste al crear el servidor. Si se pierde: servidor PG → *Reset password* |
| `DATABASE_URL` | `postgresql://adminkinesia:<PASSWORD_CODIFICADA>@kinesia-pg.postgres.database.azure.com:5432/postgres` | Se arma a mano |
| `AZURE_STORAGE_CONNECTION_STRING` | `<CONNECTION_STRING>` | `kinesiastorage` → *Security + networking → Access keys → Show* → Connection string de key1 |
| Versión / SKU de PostgreSQL | `<completar: 16 / Burstable B1ms ?>` | Servidor PG → Overview |

Codificación de caracteres especiales en la contraseña: `@`→`%40`, `#`→`%23`, `/`→`%2F`, `:`→`%3A`. **No** agregues `?sslmode=...`; el código activa SSL con `DB_SSL`.

### Variables de entorno

**Web App `kinesia-api`** (*Settings → Environment variables → App settings*):

| Nombre | Valor |
|---|---|
| `DATABASE_URL` | la cadena de arriba |
| `DB_SSL` | `true` |
| `DB_SYNC` | `true` solo el primer arranque (crea tablas); luego `false` |
| `AZURE_STORAGE_CONNECTION_STRING` | la de `kinesiastorage` |
| `AZURE_STORAGE_CONTAINER` | `kinesia-media` |

No definir `PORT`. Tras guardar, **reiniciar** la app.

**Function App `kinesia-func`**:

| Nombre | Valor |
|---|---|
| `DATABASE_URL` | la misma cadena |
| `DB_SSL` | `true` |

---

## 3. Reconstruir desde cero

Usa **la misma región** para todo (México Central).

1. **Resource group** `KinesiaIA`.
2. **PostgreSQL Flexible Server** `kinesia-pg`: Burstable B1ms, PostgreSQL authentication (`adminkinesia`), Networking → Public access, marcar *Allow public access from any Azure service* y *Add current client IP address*.
3. **Storage account** `kinesiastorage`: Standard, LRS.
   - *Configuration → Allow Blob anonymous access → Enabled → Save*.
   - **Crear el contenedor `kinesia-media`** con Public access level **Blob**. (Si no existe, la subida de fotos falla: ya nos pasó.)
   - Copiar la connection string.
4. **Web App** `kinesia-api`: Code, Node 20 LTS, Linux, plan **F1**. Agregar las variables de la sección 2. En **Deployment Center** → Source **GitHub** → repo `JoshuaCidbit/kinesIA` y rama. Esto crea un workflow de **GitHub Actions** en `.github/workflows/`; cada `git push` redespliega.
5. Probar `/api/health` → `{"status":"ok","db":"conectada",...}`. Con las tablas creadas, poner `DB_SYNC=false`.
6. **Function App** `kinesia-func`: Flex Consumption, Node.js 20, Linux. Agregar `DATABASE_URL` y `DB_SSL`.
7. Desplegar la función (sección 4).

---

## 4. Desplegar la función

Requisitos: Azure CLI (`az`) y Azure Functions Core Tools (`func`).

```bash
az login
cd functions
npm install
func azure functionapp publish kinesia-func --javascript
```

Prueba: `.../api/estadisticas/<id>` con un usuario que tenga sesiones.

### Dos detalles que aparecieron al publicar

- **`Worker runtime cannot be 'None'`**: faltó indicar el lenguaje. Se resuelve con el flag `--javascript`.
- **Falta `local.settings.json`**: Core Tools lo necesita para empaquetar. Créalo en `functions/` (ya está en `.gitignore`). Una versión mínima típica:

```json
{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AzureWebJobsStorage": "",
    "DATABASE_URL": "<DATABASE_URL>",
    "DB_SSL": "true"
  }
}
```

---

## 5. Correr las pruebas

`tests/smoke.sh` se modificó para llevar las URLs fijas en vez de variables de entorno:

```bash
BASE_URL="https://kinesia-api-gfbna7fab0gxdjc7.mexicocentral-01.azurewebsites.net"
SERVERLESS_URL="https://kinesia-func-bnb5fweeatc4awds.mexicocentral-01.azurewebsites.net"
FOTO="./LOShamster.jpeg"
```

```bash
bash tests/smoke.sh
```

Debe verse, entre otros:

| Prueba | Esperado |
|---|---|
| `GET /api/health` | 200, `db: conectada` |
| CRUD usuarios / rutinas / sesiones | 200 / 201 |
| `POST /api/usuarios/:id/foto` | `fotoUrl` apuntando a `kinesiastorage.blob.core.windows.net/kinesia-media/...` |
| `POST /api/sesiones` con usuario inexistente | 404 |
| `POST /api/usuarios` con email inválido | 400 |
| `DELETE /api/rutinas/:id` con sesiones | **409** |
| `GET /api/estadisticas/:id` (función) | 200 con `totalSesiones`, `precisionPromedio`, `tendencia` |
| Limpieza: DELETE sesión, rutina, usuario | 200 |

Para la entrega, pega aquí la salida completa final (incluye la respuesta de estadísticas de la última corrida, que quedó cortada en el chat):

```
<pegar salida completa de smoke.sh>
```

---

## 6. Problemas reales que ocurrieron y su solución

| Síntoma | Causa | Solución |
|---|---|---|
| `HTTP 000` / `NetworkError` al probar la API | La Web App no tenía variables de entorno ni reinicio | Configurar `DATABASE_URL`, `DB_SSL`, `DB_SYNC` en Web App y Function App y **reiniciar** ambas |
| Error al subir foto | El contenedor `kinesia-media` no existía | Crearlo en `kinesiastorage` con acceso público nivel *Blob* |
| **`DELETE /api/rutinas/:id` devolvía 500** en vez de 409 | La FK usa `onDelete: 'RESTRICT'`; PostgreSQL lanza el código `23001`, y Sequelize solo mapea `23503` a `SequelizeForeignKeyConstraintError`, así que caía en el `default` | Parche en `src/utils/helpers.js` (abajo) |
| La URL de la app no abría | Se usó `<nombre>.azurewebsites.net` sin el sufijo aleatorio | Usar el *Default domain* completo de Overview |
| `Worker runtime cannot be 'None'` | `func publish` sin lenguaje | Agregar `--javascript` |
| Core Tools no empaquetaba | Faltaba `local.settings.json` | Crearlo en `functions/` (sección 4) |

### Parche de `manejarError` (src/utils/helpers.js)

Al inicio de la función, antes del `switch`:

```js
function manejarError(res, err) {
  // PostgreSQL: 23503 = foreign_key_violation, 23001 = restrict_violation
  const pgCode = err.parent?.code || err.original?.code;
  if (pgCode === '23503' || pgCode === '23001') {
    return res.status(409).json({
      error: 'No se puede completar: existen registros relacionados (ej. la rutina tiene sesiones)'
    });
  }

  switch (err.name) {
    // ...el resto igual
```

Se subió con `git push` y GitHub Actions redesplegó. Para ver errores de la API en caso de otro 500: Web App → *Monitoring → Log stream*.

### Diagnóstico rápido si algo falla otra vez

| Síntoma | Revisar |
|---|---|
| `/api/health` 503 o timeout | PostgreSQL → Networking → *Allow public access from any Azure service* |
| `no pg_hba.conf entry ... no encryption` | `DB_SSL=true` |
| `password authentication failed` | Contraseña mal escrita o sin codificar en la URL |
| Foto 500 con `AuthorizationFailure` | Acceso anónimo activado en la Storage y contenedor nivel *Blob* |
| Foto sube pero la URL da 404 | Nombre exacto del contenedor (`kinesia-media`) |
| Función 404 | Ruta con prefijo `/api` y función visible en *Functions* |
| Función 500 | `DATABASE_URL` en la Function App y firewall de PostgreSQL |
| Primera petición lenta | Arranque en frío (F1 / Flex Consumption); reintentar |
| Tabla no creada | `DB_SYNC=true`, reiniciar, luego `false` |

---

## 7. Costos y limpieza

- Hay **dos App Service plans**. Revisa en cada uno su SKU y qué app lo usa; elimina el que esté huérfano o de pago sin necesidad.
- PostgreSQL consume crédito aunque no lo uses: **Overview → Stop** cuando no lo ocupes (Azure lo reinicia solo después de unos días).
- Application Insights puede generar costo con mucho tráfico.
- Crea una alerta en **Cost Management → Budgets**.
- Al terminar la evaluación: **regenera las access keys** del Storage, **cambia la contraseña** de PostgreSQL, o borra todo con **Resource groups → `KinesiaIA` → Delete resource group**.

---

## 8. Capturas de entrega

1. Grupo `KinesiaIA` con los 9 recursos.
2. PostgreSQL en *Ready* y las tablas `usuarios`, `rutinas`, `sesiones_terapia`.
3. Contenedor `kinesia-media` con archivos.
4. Web App *Running* y `/api/health` en el navegador.
5. Salida completa de `smoke.sh`.
6. Function App con `estadisticas` y su respuesta.
7. Opcional: Function App → Monitor / Invocations.

> Seguridad: las capturas muestran el ID de suscripción y tu correo institucional. Recórtalas si las vas a publicar.
