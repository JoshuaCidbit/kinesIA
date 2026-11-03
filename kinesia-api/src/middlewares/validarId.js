// Se usa con router.param('id', validarId)
module.exports = (req, res, next, valor) => {
  if (!/^\d+$/.test(valor)) {
    return res.status(400).json({ error: 'El parámetro debe ser un entero positivo' });
  }
  next();
};
