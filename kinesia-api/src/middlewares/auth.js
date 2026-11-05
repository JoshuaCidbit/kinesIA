const jwt = require('jsonwebtoken');

if (!process.env.JWT_SECRET) {
  throw new Error('Falta JWT_SECRET en las variables de entorno');
}
const SECRET = process.env.JWT_SECRET;
const EXPIRA = process.env.JWT_EXPIRES_IN || '8h';

const generarToken = (usuario) =>
  jwt.sign({ id: usuario.id, rol: usuario.rol }, SECRET, { expiresIn: EXPIRA, algorithm: 'HS256' });

const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }
    const decoded = jwt.verify(header.slice(7), SECRET, { algorithms: ['HS256'] });

    const { Usuario } = require('../models'); // require perezoso para evitar dependencia circular
    const usuario = await Usuario.findByPk(decoded.id, {
      attributes: ['id', 'nombre', 'email', 'rol', 'fotoUrl', 'coachId']
    });
    if (!usuario) return res.status(401).json({ error: 'Usuario no encontrado' });

    req.usuario = usuario;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }
    console.error('Error en auth:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
};

// Restringe por rol
const rol = (...permitidos) => (req, res, next) => {
  if (!req.usuario || !permitidos.includes(req.usuario.rol)) {
    return res.status(403).json({ error: 'No tienes permisos para acceder a este recurso' });
  }
  next();
};

// ¿Puede `user` ver/operar los datos del paciente `pacienteId`?
//   admin    -> sí
//   paciente -> solo si es él mismo
//   coach    -> solo si el paciente tiene coachId = coach.id
const puedeVer = async (user, pacienteId) => {
  const id = Number(pacienteId);
  if (!Number.isInteger(id) || id <= 0) return false;
  if (user.rol === 'admin') return true;
  if (user.rol === 'paciente') return user.id === id;
  if (user.rol === 'coach') {
    const { Usuario } = require('../models');
    return (await Usuario.count({ where: { id, coachId: user.id, rol: 'paciente' } })) > 0;
  }
  return false;
};

// Middleware: `leerId` recibe req y devuelve el id del paciente a verificar
const accesoPaciente = (leerId) => async (req, res, next) => {
  try {
    if (!(await puedeVer(req.usuario, leerId(req)))) {
      return res.status(403).json({ error: 'No tienes permisos sobre este paciente' });
    }
    next();
  } catch (err) {
    console.error('Error en accesoPaciente:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
};

module.exports = { generarToken, auth, rol, puedeVer, accesoPaciente };