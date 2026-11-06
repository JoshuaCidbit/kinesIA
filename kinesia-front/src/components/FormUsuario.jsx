import { useState } from 'react';
import { Modal } from './ui';
import { api } from '../lib/api';

export default function FormUsuario({ esAdmin, toast, onClose, onCreated }) {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState('paciente');
  const [coachId, setCoachId] = useState('');
  const [loading, setLoading] = useState(false);

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

    setLoading(true);
    try {
      const body = {
        nombre: nombre.trim(),
        email: email.trim(),
        password: password,
        rol: rol,
      };

      if (rol === 'paciente' && coachId) {
        body.coachId = Number(coachId);
      }

      await api('/api/usuarios', {
        method: 'POST',
        body,
      });

      toast?.('Usuario creado correctamente');
      onClose?.();
      onCreated?.();
    } catch (e) {
      toast?.(e.message || 'No se pudo crear el usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal titulo={esAdmin ? 'Registrar nuevo usuario' : 'Registrar nuevo paciente'} onClose={onClose} className="form-modal">
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
              <option value="">Sin coach</option>
              {/* Se poblaría con la lista real de coaches desde el parent */}
            </select>
          </div>
        )}

        {loading && <p>Guardando...</p>}

        <div className="actions">
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn pri" type="submit" disabled={loading}>Crear usuario</button>
        </div>
      </form>
    </Modal>
  );
}
