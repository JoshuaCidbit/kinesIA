const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');

const app = express();
app.use(express.json());

// Configuración de la base de datos (SQLite)
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './kinesia_db.sqlite',
  logging: false
});

// Definición de Modelos
const Usuario = sequelize.define('Usuario', {
  nombre: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  edad: { type: DataTypes.INTEGER }
});

const Rutina = sequelize.define('Rutina', {
  nombre: { type: DataTypes.STRING, allowNull: false },
  descripcion: { type: DataTypes.TEXT },
  anguloObjetivo: { type: DataTypes.FLOAT }
});

const SesionTerapia = sequelize.define('SesionTerapia', {
  fecha: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  repeticiones: { type: DataTypes.INTEGER },
  precisionPromedio: { type: DataTypes.FLOAT },
  observaciones: { type: DataTypes.TEXT }
});

// Definición de Relaciones (Relaciones 1:N)
Usuario.hasMany(SesionTerapia, { foreignKey: 'usuarioId' });
SesionTerapia.belongsTo(Usuario, { foreignKey: 'usuarioId' });
Rutina.hasMany(SesionTerapia, { foreignKey: 'rutinaId' });
SesionTerapia.belongsTo(Rutina, { foreignKey: 'rutinaId' });

// ==========================================
// RUTAS API REST (10 ENDPOINTS)
// ==========================================

// 1. POST /api/usuarios - Registrar un nuevo usuario
app.post('/api/usuarios', async (req, res) => {
  try {
    const usuario = await Usuario.create(req.body);
    res.status(201).json(usuario);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 2. GET /api/usuarios - Obtener la lista completa de usuarios
app.get('/api/usuarios', async (req, res) => {
  try {
    const usuarios = await Usuario.findAll();
    res.json(usuarios);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. GET /api/usuarios/:id - Obtener info de un usuario específico
app.get('/api/usuarios/:id', async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(usuario);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. PUT /api/usuarios/:id - Actualizar la información de un usuario
app.put('/api/usuarios/:id', async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    await usuario.update(req.body);
    res.json(usuario);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 5. POST /api/rutinas - Crear una nueva rutina con parámetros biomecánicos
app.post('/api/rutinas', async (req, res) => {
  try {
    const rutina = await Rutina.create(req.body);
    res.status(201).json(rutina);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 6. GET /api/rutinas - Obtener el catálogo de rutinas configuradas
app.get('/api/rutinas', async (req, res) => {
  try {
    const rutinas = await Rutina.findAll();
    res.json(rutinas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. PUT /api/rutinas/:id - Actualizar parámetros de una rutina
app.put('/api/rutinas/:id', async (req, res) => {
  try {
    const rutina = await Rutina.findByPk(req.params.id);
    if (!rutina) return res.status(404).json({ error: 'Rutina no encontrada' });
    await rutina.update(req.body);
    res.json(rutina);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 8. DELETE /api/rutinas/:id - Eliminar una rutina del sistema
app.delete('/api/rutinas/:id', async (req, res) => {
  try {
    const rutina = await Rutina.findByPk(req.params.id);
    if (!rutina) return res.status(404).json({ error: 'Rutina no encontrada' });
    await rutina.destroy();
    res.json({ mensaje: 'Rutina eliminada correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. POST /api/sesiones - Registrar resultados de sesión evaluados por Visión Computacional
app.post('/api/sesiones', async (req, res) => {
  try {
    const sesion = await SesionTerapia.create(req.body);
    res.status(201).json(sesion);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 10. GET /api/sesiones/:usuarioId - Obtener historial de sesiones por usuario (JOIN)
app.get('/api/sesiones/:usuarioId', async (req, res) => {
  try {
    const sesiones = await SesionTerapia.findAll({
      where: { usuarioId: req.params.usuarioId },
      include: [Usuario, Rutina]
    });
    res.json(sesiones);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// SINCRONIZACIÓN E INICIO DEL SERVIDOR
// ==========================================
const PORT = 3000;
sequelize.sync({ alter: true }).then(() => {
  console.log('Base de datos KinesIA sincronizada con éxito.');
  app.listen(PORT, () => {
    console.log(`Servidor KinesIA ejecutándose en http://localhost:${PORT}`);
  });
});