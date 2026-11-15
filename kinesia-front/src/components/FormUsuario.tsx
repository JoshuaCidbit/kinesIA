import { useId, useState, type FormEvent } from 'react';
import { Modal } from './ui';
import { useCoaches, useCrearUsuario } from '../lib/queries';
import type { Usuario } from '../lib/types';

interface FormUsuarioProps {
  esAdmin: boolean;
  toast?: (msg: string) => void;
  onClose: () => void;
}

export default function FormUsuario({ esAdmin, toast, onClose }: FormUsuarioProps) {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState('paciente');
  const [coachId, setCoachId] = useState('');
  const uid = useId();

  const crear = useCrearUsuario();
  const coachesQ = useCoaches(esAdmin);
  const coaches = (coachesQ.data ?? []) as Usuario[];

  const handleSubmit = async (e: FormEvent) => {
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

    try {
      const body: { nombre: string; email: string; password: string; rol: string; coachId?: number } = {
        nombre: nombre.trim(),
        email: email.trim(),
        password: password,
        rol: rol,
      };

      if (rol === 'paciente' && coachId) {
        body.coachId = Number(coachId);
      }

      await crear.mutateAsync(body);
      toast?.('Usuario creado correctamente');
      onClose?.();
    } catch (e) {
      toast?.(e instanceof Error ? e.message : 'No se pudo crear el usuario');
    }
  };

  return (
    <Modal titulo={esAdmin ? 'Registrar nuevo usuario' : 'Registrar nuevo paciente'} onClose={onClose} className="form-modal">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor={`${uid}-nombre`}>Nombre <span className="required">*</span></label>
          <input
            id={`${uid}-nombre`}
            className="input"
            type="text"
            required
            placeholder="Nombre completo"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor={`${uid}-email`}>Email <span className="required">*</span></label>
          <input
            id={`${uid}-email`}
            className="input"
            type="email"
            required
            placeholder="usuario@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor={`${uid}-password`}>Contraseña <span className="required">*</span></label>
          <input
            id={`${uid}-password`}
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
            <label htmlFor={`${uid}-rol`}>Rol <span className="required">*</span></label>
            <select
              id={`${uid}-rol`}
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
            <label htmlFor={`${uid}-coach`}>Coach asignado</label>
            <select id={`${uid}-coach`} className="input" value={coachId} onChange={(e) => setCoachId(e.target.value)}>
              <option value="">Sin coach</option>
              {coaches.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <small className="muted">Así el paciente empezará a recibir sus sesiones.</small>
          </div>
        )}

        <div className="actions">
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn pri" disabled={crear.isPending}>{crear.isPending ? 'Creando...' : 'Crear usuario'}</button>
        </div>
      </form>
    </Modal>
  );
}
