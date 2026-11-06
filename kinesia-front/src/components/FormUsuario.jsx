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