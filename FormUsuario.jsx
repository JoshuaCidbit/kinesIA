import { useState } from 'react';
import { Modal, Mensaje } from './ui';
import { useCrearUsuario, useCoaches } from '../lib/queries';

const VACIO = { nombre: '', email: '', edad: '', password: '', rol: 'paciente', coachId: '' };

/**
 * Modal para registrar usuarios.
 * - admin: elige rol (paciente / coach / admin) y, si es paciente, puede asignarle coach.
 * - coach: crea pacientes (el backend fuerza rol 'paciente').
 */
export default function FormUsuario({ esAdmin, onClose, toast }) {
  const [f, setF] = useState(VACIO);
  const crear = useCrearUsuario();
  const coaches = useCoaches(esAdmin);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const esPaciente = !esAdmin || f.rol === 'paciente';
  const valido = f.nombre.trim() && f.email.trim() && f.password.length >= 8;

  const enviar = (e) => {
    e.preventDefault();
    const data = { nombre: f.nombre.trim(), email: f.email.trim(), password: f.password };
    if (f.edad) data.edad = Number(f.edad);
    if (esAdmin) data.rol = f.rol;
    if (esAdmin && esPaciente && f.coachId) data.coachId = Number(f.coachId);

    crear.mutate(data, {
      onSuccess: () => {
        toast?.(esAdmin && f.rol !== 'paciente' ? 'Usuario creado' : 'Paciente creado');
        onClose();
      },
    });
  };

  return (
    <Modal titulo={esAdmin ? 'Registrar nuevo usuario' : 'Registrar nuevo paciente'} onClose={onClose}>
      <form onSubmit={enviar}>
        <label className="field">
          Nombre
          <input className="input" value={f.nombre} onChange={set('nombre')} autoFocus required />
        </label>

        <label className="field">
          Correo
          <input className="input" type="email" value={f.email} onChange={set('email')} required />
        </label>

        <label className="field">
          Edad
          <input className="input" type="number" min="1" max="120" value={f.edad} onChange={set('edad')} />
        </label>

        <label className="field">
          Contraseña (mínimo 8 caracteres)
          <input className="input" type="password" minLength={8} value={f.password} onChange={set('password')} required />
        </label>

        {esAdmin && (
          <label className="field">
            Rol
            <select className="input" value={f.rol} onChange={set('rol')}>
              <option value="paciente">Paciente</option>
              <option value="coach">Coach</option>
              <option value="admin">Admin</option>
            </select>
          </label>
        )}

        {esAdmin && esPaciente && (
          <label className="field">
            Coach asignado
            <select className="input" value={f.coachId} onChange={set('coachId')}>
              <option value="">Sin coach</option>
              {(coaches.data || []).map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </label>
        )}

        {crear.isError && <Mensaje error titulo="No se pudo crear" texto={crear.error?.message} />}

        <div className="actions">
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn pri" disabled={!valido || crear.isPending}>
            {crear.isPending ? 'Guardando…' : 'Crear'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
