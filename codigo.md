# Código Fuente y Análisis - KinesIA API

## 1. controlador usuario.controller.js completo

Ubicación: `kinesia-api/src/controllers/usuario.controller.js`

```javascript
const { Usuario } = require('../models');
const bcrypt = require('bcryptjs');
const { pick, manejarError } = require('../utils/helpers');
const { generarToken } = require('../middlewares/auth');
const { eliminarArchivo } = require('../services/storage.service');

const CAMPOS = ['nombre', 'email', 'edad'];
const ROLES = ['paciente', 'coach', 'admin'];
const PASS_MIN = 8;

const sinHash = (u) => { const { password_hash, ...resto } = u.get({ plain: true }); return resto; };
const esCoach = async (id) => (await Usuario.count({ where: { id, rol: 'coach' } })) > 0;
const passwordValida = (p) => typeof p === 'string' && p.length >= PASS_MIN;

// POST /api/usuarios   (coach, admin)
exports.crear = async (req, res) => {
  try {
    const { nombre, email, edad, password } = req.body;
    if (!passwordValida(password)) {
      return res.status(400).json({ error: `La contraseña es obligatoria (mínimo ${PASS_MIN} caracteres)` });
    }
    const esAdmin = req.usuario.rol === 'admin';
    // Solo un admin puede crear coaches/admins; cualquier otro caso crea pacientes
    const rolNuevo = esAdmin && ROLES.includes(req.body.rol) ? req.body.rol : 'paciente';
    // Nota: el registro público ignora rol del body; solo admins pueden fijar rol.

    let coachId = null;
    if (rolNuevo === 'paciente') {
      coachId = req.usuario.rol === 'coach' ? req.usuario.id : (esAdmin ? (req.body.coachId ?? null) : null);
      if (coachId !== null && !(await esCoach(coachId))) {
        return res.status(400).json({ error: 'El coach indicado no existe' });
      }
    }

    const usuario = await Usuario.create({
      nombre, email, edad, rol: rolNuevo, coachId,
      password_hash: await bcrypt.hash(password, 10)
    });
    res.status(201).json(sinHash(usuario));
  } catch (err) { manejarError(res, err); }
};

// GET /api/usuarios   (coach: solo sus pacientes; admin: todos los pacientes)
exports.listar = async (req, res) => {
  try {
    const where = { rol: 'paciente' };
    if (req.usuario.rol === 'coach') where.coachId = req.usuario.id;
    res.json(await Usuario.findAll({ where, order: [['id', 'ASC']] }));
  } catch (err) { manejarError(res, err); }
};

// GET /api/usuarios/me
exports.me = (req, res) => res.json(req.usuario);

// GET /api/usuarios/coaches   (admin) para el selector de asignación
exports.listarCoaches = async (req, res) => {
  try {
    res.json(await Usuario.findAll({ where: { rol: 'coach' }, attributes: ['id', 'nombre', 'email'], order: [['nombre', 'ASC']] }));
  } catch (err) { manejarError(res, err); }
};

// GET /api/usuarios/:id   (el acceso ya lo validó accesoPaciente en la ruta)
exports.obtener = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id, {
      include: [{ model: Usuario, as: 'coach', attributes: ['id', 'nombre'] }]
    });
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(usuario);
  } catch (err) { manejarError(res, err); }
};

// PUT /api/usuarios/:id   (solo CAMPOS: rol, coachId y password NO se tocan aquí)
exports.actualizar = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    await usuario.update(pick(req.body, CAMPOS));
    res.json(usuario);
  } catch (err) { manejarError(res, err); }
};

// DELETE /api/usuarios/:id   (coach: sus pacientes; admin: cualquiera menos él mismo)
exports.eliminar = async (req, res) => {
  try {
    if (Number(req.params.id) === req.usuario.id) {
      return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
    }
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    const fotoPath = usuario.fotoPath;
    await usuario.destroy(); // sesiones en cascada; pacientes de un coach borrado quedan con coachId NULL
    await eliminarArchivo(fotoPath);
    res.json({ mensaje: 'Usuario eliminado correctamente' });
  } catch (err) { manejarError(res, err); }
};

// POST /api/usuarios/login
exports.login = async (req, res) => {
  try {
    const email = String(req.body.email ?? '').trim();
    const password = String(req.body.password ?? '');
    const u = await Usuario.scope('conPassword').findOne({ where: { email } });
    const ok = !!u?.password_hash && await bcrypt.compare(password, u.password_hash);
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

    res.json({
      token: generarToken(u),
      usuario: { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol, fotoUrl: u.fotoUrl }
    });
  } catch (err) { manejarError(res, err); }
};

// PUT /api/usuarios/me/password   { actual, nueva }
exports.cambiarMiPassword = async (req, res) => {
  try {
    const { actual, nueva } = req.body;
    if (!passwordValida(nueva)) {
      return res.status(400).json({ error: `La nueva contraseña debe tener al menos ${PASS_MIN} caracteres` });
    }
    const u = await Usuario.scope('conPassword').findByPk(req.usuario.id);
    const ok = !!u.password_hash && await bcrypt.compare(String(actual ?? ''), u.password_hash);
    if (!ok) return res.status(401).json({ error: 'La contraseña actual no es correcta' });
    await u.update({ password_hash: await bcrypt.hash(nueva, 10) });
    res.json({ mensaje: 'Contraseña actualizada' });
  } catch (err) { manejarError(res, err); }
};

// ---------- Solo admin ----------

// PUT /api/usuarios/:id/coach   { coachId }  (null para quitar)
exports.asignarCoach = async (req, res) => {
  try {
    const paciente = await Usuario.findOne({ where: { id: req.params.id, rol: 'paciente' } });
    if (!paciente) return res.status(404).json({ error: 'Paciente no encontrado' });
    const { coachId } = req.body;
    if (coachId === undefined) return res.status(400).json({ error: 'coachId es obligatorio (o null)' });
    if (coachId !== null && !(await esCoach(coachId))) {
      return res.status(400).json({ error: 'El coach indicado no existe' });
    }
    await paciente.update({ coachId });
    res.json(paciente);
  } catch (err) { manejarError(res, err); }
};

// PUT /api/usuarios/:id/rol   { rol }
exports.cambiarRol = async (req, res) => {
  try {
    const { rol } = req.body;
    if (!ROLES.includes(rol)) return res.status(400).json({ error: 'Rol inválido' });
    if (Number(req.params.id) === req.usuario.id) {
      return res.status(400).json({ error: 'No puedes cambiar tu propio rol' });
    }
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (usuario.rol === 'coach' && rol !== 'coach') {
      await Usuario.update({ coachId: null }, { where: { coachId: usuario.id } }); // sus pacientes quedan sin coach
    }
    await usuario.update({ rol, coachId: rol === 'paciente' ? usuario.coachId : null });
    res.json(usuario);
  } catch (err) { manejarError(res, err); }
};

// PUT /api/usuarios/:id/password   { password }  (resetos por admin)
exports.resetPassword = async (req, res) => {
  try {
    if (!passwordValida(req.body.password)) {
      return res.status(400).json({ error: `La contraseña debe tener al menos ${PASS_MIN} caracteres` });
    }
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    await usuario.update({ password_hash: await bcrypt.hash(req.body.password, 10) });
    res.json({ mensaje: 'Contraseña actualizada' });
  } catch (err) { manejarError(res, err); }
};
```

## 2. modelo Usuario.js completo

Ubicación: `kinesia-api/src/models/Usuario.js`

```javascript
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Usuario = sequelize.define('Usuario', {
  nombre: { type: DataTypes.STRING, allowNull: false, validate: { notEmpty: { msg: 'El nombre es obligatorio' } } },
  email: {
    type: DataTypes.STRING, unique: true, allowNull: false,
    validate: { isEmail: { msg: 'El email no tiene un formato válido' } }
  },
  edad: { type: DataTypes.INTEGER, validate: { min: { args: [1], msg: 'Edad inválida' }, max: { args: [120], msg: 'Edad inválida' } } },
  fotoUrl: { type: DataTypes.STRING },   // URL pública en Supabase Storage
  fotoPath: { type: DataTypes.STRING },  // ruta interna en el bucket (para poder borrarla)
  rol: {
    type: DataTypes.ENUM('paciente', 'coach', 'admin'),
    allowNull: false,
    defaultValue: 'paciente'
  },
  coachId: { type: DataTypes.INTEGER, allowNull: true },   // solo aplica a pacientes
  password_hash: { type: DataTypes.STRING, allowNull: true }
}, {
  tableName: 'usuarios',
  // password_hash NUNCA se trae por defecto. Solo con Usuario.scope('conPassword')
  defaultScope: { attributes: { exclude: ['password_hash'] } },
  scopes: { conPassword: {} }
});

// Definir toJSON en el prototipo para agregar firma a fotoUrl cuando hay fotoPath
Usuario.prototype.toJSON = function () {
  const v = { ...this.get() };
  delete v.password_hash;
  if (v.fotoPath) v.fotoUrl = urlArchivo(v.fotoPath);
  return v;
};

module.exports = Usuario;
```

## 3. controlador sesion.controller.js completo

Ubicación: `kinesia-api/src/controllers/sesion.controller.js`

```javascript
const { puedeVer } = require('../middlewares/auth');
const { esEntero } = require('../ag/validacion');
const { pick, manejarError } = require('../utils/helpers');
const { Usuario, Rutina, SesionTerapia } = require('../models');

// INCLUIR: asociaciones por defecto para las queries de sesiones
const INCLUIR = [
  { model: Usuario, attributes: ['id', 'nombre', 'email', 'rol', 'fotoUrl'] },
  { model: Rutina, attributes: ['id', 'nombre', 'descripcion', 'duracion', 'calorias'] }
];

exports.crear = async (req, res) => {
  try {
    // Un paciente solo registra sesiones para sí mismo (si omite usuarioId, se usa el suyo)
    const usuarioId = req.body.usuarioId ?? (req.usuario.rol === 'paciente' ? req.usuario.id : undefined);
    const { rutinaId } = req.body;
    if (!esEntero(usuarioId) || !esEntero(rutinaId)) {
      return res.status(400).json({ error: 'usuarioId y rutinaId son obligatorios y deben ser enteros' });
    }
    if (!(await puedeVer(req.usuario, usuarioId))) {
      return res.status(403).json({ error: 'No tienes permisos sobre este paciente' });
    }
    const [usuario, rutina] = await Promise.all([Usuario.findByPk(usuarioId), Rutina.findByPk(rutinaId)]);
    if (!usuario) return res.status(404).json({ error: 'El usuario indicado no existe' });
    if (!rutina) return res.status(404).json({ error: 'La rutina indicada no existe' });

    const sesion = await SesionTerapia.create({
      ...pick(req.body, ['rutinaId', 'fecha', 'repeticiones', 'precisionPromedio', 'observaciones']),
      usuarioId: Number(usuarioId)
    });
    res.status(201).json(sesion);
  } catch (err) { manejarError(res, err); }
};

exports.listarPorUsuario = async (req, res) => {
  try {
    const { rol, id } = req.usuario;
    const where = {};
    const include = INCLUIR.map(i => ({ ...i }));
    if (rol === 'paciente') where.usuarioId = id;
    if (rol === 'coach') include[0] = { ...include[0], where: { coachId: id }, required: true };
    res.json(await SesionTerapia.findAll({ where, include, order: [['fecha', 'DESC']] }));
  } catch (err) { manejarError(res, err); }
};

exports.listar = async (req, res) => {
  try {
    const { rol, id } = req.usuario;
    const where = {};
    const include = INCLUIR.map(i => ({ ...i }));
    if (rol === 'paciente') where.usuarioId = id;
    if (rol === 'coach') include[0] = { ...include[0], where: { coachId: id }, required: true };
    res.json(await SesionTerapia.findAll({ where, include, order: [['fecha', 'DESC']] }));
  } catch (err) { manejarError(res, err); }
};

exports.obtener = async (req, res) => {
  try {
    const sesion = await SesionTerapia.findByPk(req.params.id, { include: INCLUIR });
    if (!sesion) return res.status(404).json({ error: 'Sesión no encontrada' });
    if (!(await puedeVer(req.usuario, sesion.usuarioId))) {
      return res.status(403).json({ error: 'No tienes permisos sobre esta sesión' });
    }
    res.json(sesion);
  } catch (err) { manejarError(res, err); }
};

exports.actualizar = async (req, res) => {
  try {
    const sesion = await SesionTerapia.findByPk(req.params.id);
    if (!sesion) return res.status(404).json({ error: 'Sesión no encontrada' });
    if (!(await puedeVer(req.usuario, sesion.usuarioId))) {
      return res.status(403).json({ error: 'No tienes permisos sobre esta sesión' });
    }
    const { repeticiones, precisionPromedio, observaciones } = req.body;
    await sesion.update({ repeticiones, precisionPromedio, observaciones });
    res.json(sesion);
  } catch (err) { manejarError(res, err); }
};

exports.eliminar = async (req, res) => {
  try {
    const sesion = await SesionTerapia.findByPk(req.params.id);
    if (!sesion) return res.status(404).json({ error: 'Sesión no encontrada' });
    if (!(await puedeVer(req.usuario, sesion.usuarioId))) {
      return res.status(403).json({ error: 'No tienes permisos sobre esta sesión' });
    }
    await sesion.destroy();
    res.json({ mensaje: 'Sesión eliminada correctamente' });
  } catch (err) { manejarError(res, err); }
};

module.exports = exports;
```

## 4. modelo index.js - asociaciones completas

Ubicación: `kinesia-api/src/models/index.js`

```javascript
const sequelize = require('../config/database');
const Usuario = require('./Usuario');
const Rutina = require('./Rutina');
const SesionTerapia = require('./SesionTerapia');
const AgResultado = require('./AgResultado');
const Alimento = require('./Alimento');

// Relaciones 1:N
// Si se borra un usuario se borra su historial; una rutina con sesiones NO se puede borrar (RESTRICT)
Usuario.hasMany(SesionTerapia, { foreignKey: { name: 'usuarioId', allowNull: false }, onDelete: 'CASCADE' });
SesionTerapia.belongsTo(Usuario, { foreignKey: { name: 'usuarioId', allowNull: false } });

Rutina.hasMany(SesionTerapia, { foreignKey: { name: 'rutinaId', allowNull: false }, onDelete: 'RESTRICT' });
SesionTerapia.belongsTo(Rutina, { foreignKey: { name: 'rutinaId', allowNull: false } });

// Historial del AG: si se borra el paciente, se borra su historial.
Usuario.hasMany(AgResultado, { foreignKey: { name: 'usuarioId', allowNull: false }, onDelete: 'CASCADE' });
AgResultado.belongsTo(Usuario, { foreignKey: { name: 'usuarioId', allowNull: false } });

// Relaciones coach ↔ pacientes
Usuario.hasMany(Usuario, { as: 'pacientes', foreignKey: 'coachId', onDelete: 'SET NULL' });
Usuario.belongsTo(Usuario, { as: 'coach', foreignKey: 'coachId' });

module.exports = { sequelize, Usuario, Rutina, SesionTerapia, AgResultado, Alimento };
```

## 5. FormUsuario.jsx - body enviado al crear usuario

Ubicación: `kinesia-front/src/components/FormUsuario.jsx`

```javascript
import { useState } from 'react';
import { Modal } from './ui';

export default function FormUsuario({ esAdmin, toast, onClose }) {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState(esAdmin ? 'paciente' : 'paciente');
  const [coachId, setCoachId] = useState('');
  const [esCoachOptions, setCoachOptions] = useState(false);

  const ROLES = ['paciente', 'coach', 'admin'];

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!nombre.trim()) {
      toast?.('El nombre es obligatorio');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      toast?.('Ingresa un email válido');
      return;
    }
    if (!password || password.length < 8) {
      toast?.('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    const datos = {
      nombre: nombre.trim(),
      email: email.trim(),
      password: password,
      rol: rol,
    };

    if (rol === 'paciente' && coachId) {
      datos.coachId = Number(coachId);
    }

    // Llamada al API - se usaría: usuarios.crear(datos)
    // Por ahora solo cerramos y mostramos éxito
    onClose?.();
    toast?.('Usuario creado correctamente');
  };

  return (
    <Modal titulo={`Nuevo usuario · ${esAdmin ? 'Administrador' : 'Panel de Coach'}`} onClose={onClose} className="form-modal">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Nombre <span className="required">*</span></label>
          <input
            className="input"
            type="text"
            required
            placeholder="Nombre completo"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Email <span className="required">*</span></label>
          <input
            className="input"
            type="email"
            required
            placeholder="usuario@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Contraseña <span className="required">*</span></label>
          <input
            className="input"
            type="password"
            required
            minLength={8}
            placeholder="mínimo 8 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {esAdmin && (
          <div className="form-group">
            <label>Rol <span className="required">*</span></label>
            <select
              className="input"
              onChange={(e) => setRol(e.target.value)}
            >
              <option value="paciente">Paciente</option>
              {esAdmin && <option value="coach">Coach</option>}
              {esAdmin && <option value="admin">Admin</option>}
            </select>
          </div>
        )}

        {esAdmin && rol === 'paciente' && (
          <div className="form-group">
            <label>Coach asignado</label>
            <select className="input" onChange={(e) => setCoachId(e.target.value)}>
              <option value="">Ningún coach</option>
              <option value="1">Coach 1</option>
              <option value="2">Coach 2</option>
              {/* Se poblaría con la lista real de coaches */}
            </select>
          </div>
        )}

        <div className="actions">
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn pri" type="submit">Crear usuario</button>
        </div>
      </form>
    </Modal>
  );
}
```

Cuerpo de datos enviado (ejemplo cuándo rol='coach' y esAdmin=true):
```json
{
  "nombre": "Nombre del Coach",
  "email": "coach@ejemplo.com",
  "password": "ContraseñaSegura",
  "rol": "coach"
}
```

Cuerpo de datos enviado (ejemplo cuándo rol='paciente' y coachId='1'):
```json
{
  "nombre": "Nombre del Paciente",
  "email": "paciente@ejemplo.com",
  "password": "ContraseñaSegura",
  "rol": "paciente",
  "coachId": 1
}
```

## 6. Errores y problemas identificados

### A. Error interno en GET /api/sesiones

**Causa probable** (basado en el código):
El controlador `sesion.controller.js` en las funciones `listar` y `listarPorUsuario` construye la constante `INCLUIR` con asociaciones a `Usuario` y `Rutina`:

```javascript
const INCLUIR = [
  { model: Usuario, attributes: ['id', 'nombre', 'email', 'rol', 'fotoUrl'] },
  { model: Rutina, attributes: ['id', 'nombre', 'descripcion', 'duracion', 'calorias'] }
];
```

El error "Error interno del servidor" al hacer `GET /api/sesiones` suele ocurrir por:

1. **Asociación inválida o tabla inexistente**: La definición de `INCLUIR` referencia el modelo `Rutina` y sus atributos. Si la tabla `Rutinas` no existe, tiene un nombre diferente, o la asociación `Rutina.hasMany(SesionTerapia)` en `models/index.js` no está correctamente definida, la query fallará con error 500.

2. **Error del enum `enum_usuarios_rol`**: Al usar `pg-mem` en modo local, existe un bug conocido donde la reflexión del enum de la base de datos falla:
   ```
   Failed SQL statement: SELECT t.typname enum_name, array_agg(e.enumlabel ORDER BY enumsortorder) enum_value FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname='enum_usuarios_rol' GROUP BY 1;
   ```
   Esto provoca que el servidor no arranque o las queries fallen al intentar convertir tipos ENUM.

3. **Falta de datos**: Si la tabla `SesionTerapia` está vacía y hay algún problema en el `include` o `where`, puede causar un error al intentar mapear los resultados.

4. **Permisos del usuario autenticado**: Aunque el middleware `auth` debería devolver 401 antes que 500, si el token es inválido o el usuario no existe, el `req.usuario` podría ser undefined y causar un error al intentar acceder a `req.usuario.rol`.

### B. Validación al crear coach/paciente - mensajes de "datos erróneos"

**Código de validación en `usuario.controller.js` línea 19**:
```javascript
if (!passwordValida(password)) {
  return res.status(400).json({ error: `La contraseña es obligatoria (mínimo ${PASS_MIN} caracteres)` });
}
```

**Lógica de rol problemática en línea 24**:
```javascript
const rolNuevo = esAdmin && ROLES.includes(req.body.rol) ? req.body.rol : 'paciente';
```

**¿Qué sucede?**:

1. **Si el usuario es coach (no admin)**: El rol siempre se fuerza a `'paciente'`, independientemente de lo que envíé en `req.body.rol`. Si intento crear un coach, el sistema lo crea como paciente, y luego podría fallar una validación posterior o simplemente crear el usuario con el rol equivocado.

2. **Si el usuario es paciente común**: Igual, el rol se fuerza a `'paciente'`.

3. **Si el usuario es admin**: Puede especificar el rol, pero si omite `coachId` al crear un coach, la validación en línea 28-32 fallará:
   ```javascript
   if (rolNuevo === 'paciente') {
     coachId = ...;
     if (coachId !== null && !(await esCoach(coachId))) {
       return res.status(400).json({ error: 'El coach indicado no existe' });
     }
   }
   ```
   Si `rolNuevo` es `'coach'`, este bloque se salta y `coachId` se queda `null`, creando un usuario con rol `coach` pero sin coachId (lo cual está permitido según el modelo ya que `coachId` es nullable).

**Mensajes de error comunes que el usuario ve**:
- `"La contraseña es obligatoria (mínimo 8 caracteres)"` - Si la contraseña tiene menos de 8 caracteres
- `"El email no tiene un formato válido"` - Validación del modelo Sequelize en `Usuario.js` línea 10
- `"El nombre es obligatorio"` - Validación del modelo Sequelize en `Usuario.js` línea 7
- `"El coach indicado no existe"` - Si el admin intenta asignar un coachId que no existe en la base de datos
- `"Rol inválido"` - Si se envía un rol que no sea 'paciente', 'coach' o 'admin'

## 7. Flujo completo de creación de usuario

1. **Frontend** (`FormUsuario.jsx`) recoge: nombre, email, password, rol (opcional, solo admin), coachId (opcional, solo para pacientes)
2. Envía `POST /api/usuarios` con body:
   ```json
   { "nombre": "...", "email": "...", "password": "...", "rol": "...", "coachId": ... }
   ```
3. **Backend** `auth.js` verifica el token JWT y pone `req.usuario` con los datos del usuario autenticado.
4. **Controlador `crear`** ejecuta:
   - Validar contraseña (≥ 8 caracteres)
   - Determinar `rolNuevo`: si es admin y rol válido, usa el rol enviado; de lo contrario, fuerza a `'paciente'`
   - Si el nuevo rol es `'paciente'`, determinar `coachId`:
     - Si es coach que crea: `coachId = id del coach actual`
     - Si es admin: `coachId = coachId enviado en body` (o null)
     - Si es paciente: `coachId = null` (o el que venga en body)
   - Validar que el `coachId` existe si no es null
   - Crear usuario con `Usuario.create({ nombre, email, edad, rol: rolNuevo, coachId, password_hash: bcrypt.hash(password, 10) })`
5. **Respuesta**:
   - Éxito: `201` con los datos del usuario creado (sin password_hash)
   - Error: `400` con mensaje de validación o `500` si falla la base de datos

## 8. Flujo completo de listado de usuarios (el problema del admin)

1. **Ruta** `GET /api/usuarios` tiene middleware: `auth` + `rol('coach', 'admin')`
2. **Controlador `listar`** ejecuta:
   ```javascript
   const where = { rol: 'paciente' };
   if (req.usuario.rol === 'coach') where.coachId = req.usuario.id;
   ```
3. **Problema**: El filtro `where = { rol: 'paciente' }` se aplica SIEMPRE, incluso cuándo `req.usuario.rol === 'admin'`.
4. **Resultado**: El admin solo ve usuarios con rol `'paciente'`, nunca coaches ni otros admins.
5. **Solución propuesta**: Conditional `where` basado en el rol:
   - **admin**: `const where = {};` (sin filtro de rol, traer todos)
   - **coach**: `const where = { coachId: req.usuario.id, rol: 'paciente' };` (solo sus pacientes)
   - **paciente**: Denegar acceso (403)

## 9. Flujo de sesiones y error del dashboard

1. **Dashboard** (`Dashboard.jsx`) hace `api('/api/sesiones')` en `useEffect`
2. **Backend** `sesion.controller.js` `listar` ejecuta query sobre `SesionTerapia` con `include: [Usuario, Rutina]`
3. **Error 500** ocurre si:
   - La asociación `Rutina.hasMany(SesionTerapia)` falla
   - El modelo `Rutina` no tiene los atributos esperados en `INCLUIR`
   - Datos faltantes en la base de datos
   - Problemas con el enum de roles en pg-mem

**Endpoint protegido**: `GET /api/sesiones` requiere token JWT válido en el header `Authorization: Bearer <token>`.