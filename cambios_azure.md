# Cambios necesarios para despliegue en Azure

## 1. Variables de entorno en Azure App Service

En el panel de Azure App Service, agregar las siguientes configuraciones de aplicación:

### Obligatorias:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `JWT_SECRET` | Secreto para firmar los tokens JWT (obligatorio). El servidor **no arranca** sin este valor. | `cambia_este_secreto_por_uno_propio_con_randomBytes_48` |
| `DATABASE_URL` | Cadena de conexión a PostgreSQL Flexible Server | `postgresql://adminkinesia:TU_PASSWORD@TU-SERVIDOR.postgres.database.azure.com:5432/postgres` |
| `CORS_ORIGIN` | Origen(es) permitidos del frontend, separados por coma | `http://localhost:5173` o `https://TU-STATIC-WEB-APP.azurestaticapps.net` |

### Opcionales:

| Variable | Descripción | Default |
|----------|-------------|---------|
| `JWT_EXPIRES_IN` | Tiempo de expiración del token | `8h` |
| `DB_SSL` | Forzar SSL en conexión PostgreSQL | `true` |
| `USE_PG_MEM` | Usar base de datos en memoria (solo desarrollo/local) | `false` |
| `DB_SYNC` | Sincronizar automáticamente los modelos al iniciar | `true` (primera vez) |
| `SEED_ALIMENTOS` | Cargar catálogo de alimentos al arrancar | `false` |

### Almacenamiento Azure (para subir fotos/medios):

| Variable | Descripción |
|----------|-------------|
| `AZURE_STORAGE_CONNECTION_STRING` | Cadena de conexión de la cuenta de almacenamiento Azure |
| `AZURE_STORAGE_CONTAINER` | Nombre del contenedor (ej: `kinesia-media`) |

### Azure Functions (para estadísticas opcional):

| Variable | Descripción |
|----------|-------------|
| `FUNCTIONS_URL` | URL de la función Azure de estadísticas |
| `FUNCTIONS_KEY` | Clave de la función Azure (opcional si está anónima) |

## 2. Migración de base de datos (ejecutar una vez)

Ejecutar el siguiente SQL en el PostgreSQL de Azure (puede hacerse con el Azure Data Studio o el psql command line):

```sql
-- Renombrar 'normal' a 'paciente' en el ENUM (si ya existe con 'normal' de la implementación anterior)
ALTER TYPE "enum_usuarios_rol" RENAME VALUE 'normal' TO 'paciente';

-- Establecer default a 'paciente' para nuevos usuarios
ALTER TABLE usuarios ALTER COLUMN rol SET DEFAULT 'paciente';

-- Agregar columna coachId (relación coach → pacientes)
ALTER TABLE usuarios
  ADD COLUMN "coachId" INTEGER NULL REFERENCES usuarios(id) ON DELETE SET NULL;

-- Crear índice para queries por coach
CREATE INDEX idx_usuarios_coach ON usuarios ("coachId");
```

**Importante**: Si usa pg-mem en memoria (local), estos cambios no son necesarios; solo para PostgreSQL real.

## 3. Configuración de CORS

En Azure App Service -> Configuración -> CORS, agregar el origen del frontend:
- En producción: `https://TU-NOMBRE.static.azurewebsites.net`
- En desarrollo: `http://localhost:5173`

Separar múltiples orígenes con comas si el front se sirve de diferentes dominios.

## 4. Configuración de almacenamiento Blob (para subir fotos/medios)

1. Crear una Cuenta de Almacenamiento en Azure
2. Obtener la `AZURE_STORAGE_CONNECTION_STRING` desde la consola de Azure (Herramientas -> Cadena de conexión)
3. Crear un contenedor `kinesia-media` (tipo `blob`, acceso público si es necesario)
4. Agregar la variable de entorno `AZURE_STORAGE_CONNECTION_STRING` y `AZURE_STORAGE_CONTAINER` al App Service

## 5. Despliegue del frontend

El frontend (kinesia-front) se puede desplegar como Azure Static Web App:

1. En Azure Portal, crear un Static Web App vinculado al repositorio GitHub
2. El comando de build es: `npm run build`
3. El comando de salida es: `dist/`
4. Las variables de entorno del backend deben ser accesibles desde el frontend mediante `VITE_API_URL`

## 5. Verificación posterior al despliegue

Después de levantar la API en Azure, verificar:

1. ✅ El servidor **no arranca** sin `JWT_SECRET`, con mensaje claro: `"Falta JWT_SECRET en las variables de entorno"`
2. ✅ Login correcto devuelve `token` y `usuario` con `id, nombre, email, rol, fotoUrl` (sin `password_hash`)
3. ✅ Login con contraseña mala o email inexistente → 401
4. ✅ 11 logins fallidos seguidos → 429
5. ✅ Sin token o token alterado/vencido → 401 en todas las rutas salvo `/login` y `/health`
6. ✅ **No aparece `password_hash`** en ninguna respuesta de API (crear, listar, obtener, actualizar, foto, login)
7. ✅ Paciente P1 → `GET /api/usuarios/<P2>` = 403
8. ✅ Coach A → `GET /api/usuarios` devuelve solo sus pacientes
9. ✅ Paciente: menú con una sola opción (Mi panel)
10. ✅ Recargar página mantiene la sesión (gracias a `/me`)

## 6. Variables que NO deben subirse a Git

Per `.gitignore` existente, estos archivos y variables son locales:

- `.env` - Contiene credenciales reales, nunca subir a git
- `.env.local` - Igual, configuración local
- Cualquier token secreto, passwords reales

## Resumen

Lo esencial para Azure:
1. `JWT_SECRET` en Application Settings
2. `DATABASE_URL` con conexión a PostgreSQL real (o usar pg-mem para dev)
3. `CORS_ORIGIN` configurado
4. SQL de migración ejecutado una vez
5. Blob Storage configurado si se usan subidas de fotos

Lo opcional:
- `JWT_EXPIRES_IN`, `DB_SSL`, `USE_PG_MEM`, `DB_SYNC`
- `AZURE_STORAGE_CONNECTION_STRING` / `CONTAINER`
- `FUNCTIONS_URL` / `FUNCTIONS_KEY`

Toda la lógica y código fuente ya está listo (segui el prompt `prompt_login_roles_kinesia.md`). Lo que falte son estos valores de configuración en el portal de Azure.