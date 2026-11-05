const { Usuario } = require('../models');
const bcrypt = require('bcryptjs');
const { pick, manejarError } = require('../utils/helpers');
const { generarToken } = require('../middlewares/auth');
// IMPORTANTE: agregar aquí el require de `eliminarArchivo`
// (buscar con grep dónde está definida; la versión anterior lo usaba sin importarlo)

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