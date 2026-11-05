import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { go } from '../App';

export default function Pacientes({ go, toast }) {
  const { usuario } = useAuth();

  const esPaciente = usuario.rol === 'paciente';

  if (esPaciente) {
    return null; // El paciente no tiene acceso a esta página
  }

  // Coach o admin
  const esCoach = usuario.rol === 'coach';
  const esAdmin = usuario.rol === 'admin';

  return (
    <div>
      <h2>Pacientes</h2>
      {esAdmin && (
        <p>
          <strong>Modo admin:</strong> puedes ver todos los pacientes y asignar coaches.
        </p>
      )}
      <p>Modo coach: ves solo tus pacientes asignados.</p>
      <p>Total de pacientes: pending</p>
      <button>Registrar nuevo paciente</button>
    </div>
  );
}