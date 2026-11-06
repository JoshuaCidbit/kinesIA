import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { Avatar, Mensaje } from '../components/ui';

const CLASE_ROL = { admin: 'c-ochre', coach: 'c-sage', paciente: 'c-primary' };

export default function Perfil({ id, go, toast, embebido = false }) {
  const { usuario } = useAuth();
  const esPaciente = usuario.rol === 'paciente';
  const esCoach = usuario.rol === 'coach';
  const esAdmin = usuario.rol === 'admin';

  const pacienteId = id || usuario.id;

  // Cargar datos del paciente
  const [paciente, setPaciente] = useState(null);
  useEffect(() => {
    const cargar = async () => {
      try {
        const data = await api(`/api/usuarios/${pacienteId}`);
        setPaciente(data);
      } catch (err) {
        console.error('Error cargando perfil:', err);
        if (err.status === 403) toast?.('No tienes acceso a este paciente');
      }
    };
    cargar();
  }, [pacienteId]);

  if (!paciente) return <Mensaje titulo="Cargando perfil..." />;

  const rolPerfil = paciente.rol ?? 'paciente';
  const Titulo = embebido ? 'h2' : 'h1';

  const quitarCoach = () =>
    api(`/api/usuarios/${pacienteId}/coach`, { method: 'PUT', body: { coachId: null } })
      .then(() => toast?.('Coach quitado'))
      .catch((err) => toast?.(err.message));

  return (
    <>
      {!embebido && !esPaciente && (
        <button className="back" onClick={() => go('pacientes')}>← Volver a pacientes</button>
      )}

      <div className="card hero">
        <Avatar usuario={paciente} large />
        <div className="grow">
          <Titulo>{paciente.nombre}</Titulo>
          <span className={'badge ' + (CLASE_ROL[rolPerfil] ?? 'c-primary')}>{rolPerfil}</span>
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <h2>Datos</h2>
          <p>Email: {paciente.email}</p>
          {paciente.edad && <p>Edad: {paciente.edad}</p>}
        </div>

        {esPaciente && (
          <div className="card">
            <h2>Mis datos</h2>
            <div className="btns">
              <button className="btn">Cambiar foto</button>
              <button className="btn">Plan calórico</button>
              <button className="btn pri">Registrar sesión</button>
              <button className="btn">Cambiar contraseña</button>
            </div>
          </div>
        )}

        {esCoach && (
          <div className="card">
            <h2>Gestión de paciente</h2>
            <div className="btns">
              <button className="btn">Editar paciente</button>
              <button className="btn dng">Eliminar sesión</button>
              <button className="btn dng">Eliminar paciente</button>
            </div>
          </div>
        )}

        {esAdmin && (
          <div className="card">
            <h2>Panel administrativo</h2>
            <p>Coach asignado: <span className="muted">pendiente</span></p>
            <div className="btns">
              <button className="btn dng" onClick={quitarCoach}>Quitar coach</button>
              <button className="btn">Restablecer contraseña</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
