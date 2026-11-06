import { useState, useEffect } from 'react';
import { Modal } from './ui';
import { api } from '../lib/api';

export default function FormUsuario({ esAdmin, toast, onClose, onCreated }) {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState(esAdmin ? 'paciente' : 'paciente');
  const [coachId, setCoachId] = useState('');
  const [esCoachOptions, setCoachOptions] = useState(false);
  const [coaches, setCoaches] = useState([]);

  useEffect(() => {
    if (esAdmin) {
      api('/api/usuarios/coaches').then(res => setCoaches(res.data)).catch(() => {});
    }
  }, [esAdmin]);

  const handleSubmit = async (e) => {
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
    };

    if (esAdmin) datos.rol = rol;
    if (esAdmin && rol === 'paciente' && coachId) datos.coachId = Number(coachId);

    try {
      await api('/api/usuarios', { method: 'POST', body: datos });
      toast?.('Usuario creado correctamente');
      onCreated?.();
      onClose?.();
    } catch (err) {
      toast?.(err.message || 'Error al crear usuario');
    }
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
              value={rol}
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
            <select className="input" value={coachId} onChange={(e) => setCoachId(e.target.value)}>
              <option value="">Ningún coach</option>
              {coaches.length > 0 ? (
                coaches.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)
              ) : (
                <option value="">Cargando coaches...</option>
              )}
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