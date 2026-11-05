require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Usuario } = require('../src/models');
const sequelize = require('../src/config/database');

(async () => {
  const [email, password, nombre = 'Administrador'] = process.argv.slice(2);
  if (!email || !password || password.length < 8) {
    console.error('Uso: node scripts/crear-admin.js <email> <password(min 8)> [nombre]');
    process.exit(1);
  }
  const password_hash = await bcrypt.hash(password, 10);
  const existente = await Usuario.findOne({ where: { email } });
  if (existente) {
    await existente.update({ rol: 'admin', coachId: null, password_hash });
    console.log(`Usuario ${email} actualizado como admin.`);
  } else {
    await Usuario.create({ nombre, email, rol: 'admin', password_hash });
    console.log(`Admin ${email} creado.`);
  }
  await sequelize.close();
})().catch(e => { console.error(e); process.exit(1); });