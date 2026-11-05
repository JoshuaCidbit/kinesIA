# 📄 Instrucciones para Migración de Base de datos Azure PostgreSQL

## Objetivo
Ejecutar los siguientes comandos SQL en la base de datos PostgreSQL flexible server `kinesia-pg` del resource group `KinesIA` para completar la migración de roles y agregar la columna `coachId`.

---

## Requisitos previos

1. **Azure Data Studio** instalado (disponible en: https://learn.microsoft.com/en-us/sql/azure-data-studio/download-azure-data-studio)
2. Credenciales de acceso a Azure PostgreSQL:
   - Usuario: `adminkinesia`
   - Servidor: `kinesia-pg.postgres.database.azure.com`
   - Base de datos: `postgres`
   - Puerto: `5432`
   - Contraseña: `acordeon6#` (o la que esté configurada)

---

## Paso a paso usando Azure Data Studio

### 1. Abrir Azure Data Studio
- Inicia la aplicación Azure Data Studio en tu equipo

### 2. Conectar al servidor PostgreSQL
- Haz clic en **Connect** (o el icono de +)
- Selecciona **PostgreSQL**
- Completa los campos:
  - **Server:** `kinesia-pg.postgres.database.azure.com`
  - **Database:** `postgres`
  - **User Name:** `adminkinesia`
  - **Password:** `acordeon6#` (o la contraseña actual)
  - **Port:** `5432`
  - **SSL toggle:** Activa (asegúrate que el interruptor esté en posición ON)
- Haz clic en **Connect**

### 3. Abrir una nueva consulta
- En el explorador de servidores (izquierda), haz clic derecho sobre el servidor `kinesia-pg`
- Selecciona **New Query** (o Nueva consulta)
- Se abrirá una ventana de editor SQL conectada

### 4. Ejecutar los comandos SQL

Copia y pega cada uno de los siguientes bloques en la ventana de consulta y ejecútalos (Shift+Enter o haz clic en el botón de play):

#### 🔹 1. Renombrar 'normal' a 'paciente' en el ENUM
```sql
-- Renombrar 'normal' a 'paciente' en el ENUM (si ya existe con 'normal' de la implementación anterior)
ALTER TYPE "enum_usuarios_rol" RENAME VALUE 'normal' TO 'paciente';
```

#### 🔹 2. Establecer default a 'paciente' para nuevos usuarios
```sql
-- Establecer default a 'paciente' para nuevos usuarios
ALTER TABLE usuarios ALTER COLUMN rol SET DEFAULT 'paciente';
```

#### 🔹 3. Agregar columna coachId (relación coach → pacientes)
```sql
-- Agregar columna coachId (relación coach → pacientes)
ALTER TABLE usuarios
  ADD COLUMN "coachId" INTEGER NULL REFERENCES usuarios(id) ON DELETE SET NULL;
```

#### 🔹 4. Crear índice para queries por coach
```sql
-- Crear índice para queries por coach
CREATE INDEX idx_usuarios_coach ON usuarios ("coachId");
```

### 5. Verificar los cambios
Ejecuta esta consulta para verificar que todo quedó bien:

```sql
-- Verificar el ENUM tiene el valor 'paciente'
SELECT * FROM pg_enum WHERE enumlabel = 'paciente' AND enumtypid = 'enum_usuarios_rol'::regtype;

-- Verificar la columna coachId existe
\d usuarios

-- Verificar el índice fue creado
SELECT indexname FROM pg_indexes WHERE indexname = 'idx_usuarios_coach';
```

### 6. Reiniciar la API en Azure (opcional pero recomendado)
Después de aplicar la migración, reinicia el App Service para que tomen efecto todos los cambios:

```bash
az webapp restart --name kinesia-api --resource-group KinesIA
```

---

## ⚠️ Notas importantes

- **Ejecutar solo una vez**: Estos cambios son un proceso de migración único. No vuelvas a ejecutarlos en cada despliegue.
- **Si usas pg-mem en local**: Estos cambios **no** son necesarios; solo aplica para PostgreSQL real en Azure.
- **Si falla alguna sentencia**: Puedes ejecutarlas individualmente. El orden importa (primero el ENUM, luego la columna y el índice).
- **Password**: Si la contraseña `acordeon6#` no funciona, consulta el valor actual en Azure Portal → `kinesia-pg` → `Password` o usa el connection string `DATABASE_URL` existente.
- **Solución de problemas**: Si obtienes error de permisos, asegúrate de estar conectado como `adminkinesia` (usuario administrador del servidor PostgreSQL).

---

## ✅ Verificación posterior

Después de ejecutar la migración, confirma que la API funciona correctamente:

```bash
# Health check
curl -s https://kinesia-api-gfbna7fab0gxdjc7.mexicocentral-01.azurewebsites.net/api/health

# Debería devolver: {"status":"ok","db":"conectada",...}
```

---

## 📌 Comandos alternativos usando az CLI (si tienes conectividad)

Si tienes acceso de red directo desde tu terminal a Azure, también puedes intentar:

```bash
# Nota: Estos comandos pueden no funcionar dependiendo de las restricciones de red
psql "postgresql://adminkinesia:acordeon6%23@kinesia-pg.postgres.database.azure.com:5432/postgres" -c "
  ALTER TYPE \"enum_usuarios_rol\" RENAME VALUE 'normal' TO 'paciente';
  ALTER TABLE usuarios ALTER COLUMN rol SET DEFAULT 'paciente';
  ALTER TABLE usuarios ADD COLUMN \"coachId\" INTEGER NULL REFERENCES usuarios(id) ON DELETE SET NULL;
  CREATE INDEX idx_usuarios_coach ON usuarios (\"coachId\");
"
```

---

**Documentación generada el:** $(date +%Y-%m-%d)
**Resource Group:** `KinesIA`
**Servidor PostgreSQL:** `kinesia-pg`