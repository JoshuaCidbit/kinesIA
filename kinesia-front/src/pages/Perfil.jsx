import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { go } from '../App';

export default function Perfil({ id, go, toast }) {
  const { usuario, login } = useAuth();
  const esPaciente = usuario.rol === 'paciente';
  const esCoach = usuario.rol === 'coach';
  const esAdmin = usuario.rol === 'admin';

  let pacienteId = id;
  if (!pacienteId) {
    pacienteId = usuario.id;
  }

  // Cargar datos del paciente
  const [paciente, setPaciente] = useState(null);
  useEffect(() => {
    const cargar = async () => {
      try {
        const data = await api(`/api/usuarios/${pacienteId}`);
        setPaciente(data);
      } catch (err) {
        console.error('Error cargando perfil:', err);
        if (err.status === 403) {
          toast = 'No tienes acceso a este paciente';
        }
      }
    };
    cargar();
  }, [pacienteId]);

  if (!paciente) return <div>Cargando perfil...</div>;

  return (
    <div>
      <h2>Perfil - {paciente.nombre}</h2>
      
      {/* Datos del paciente */}
      <p>Email: {paciente.email}</p>
      {paciente.edad && <p>Edad: {paciente.edad}</p>}

      {/* Mostrar u ocultar botones según el rol */}
      {esPaciente && (
        <div>
          <h3>Mis datos</h3>
          <button>Cambiar foto</button>
          <button>Plan calórico</button>
          <button>Registrar sesión</button>
          <button onClick={() => login('actual', 'nueva')}>Cambiar contraseña</button>
        </div>
      )}

      {esCoach && (
        <div>
          <h3>Gestión de paciente</h3>
          <button>Editar paciente</button>
          <button>Eliminar sesión</button>
          <button>Eliminar paciente</button>
        </div>
      )}

      {esAdmin && (
        <div>
          <h3>Panel administrativo</h3>
          <p>Coach asignado: pending</p>
          <button onClick={() => api(`/api/usuarios/${pacienteId}/coach`, { method: 'PUT', body: { coachId: null } })}>Quitar coach</button>
          <button>Restablecer contraseña</button>
        </div>
      )}
    </div>
  );
}