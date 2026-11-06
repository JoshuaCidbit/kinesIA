import { useAuth } from '../contexts/AuthContext';

export default function Pacientes({ go, toast }) {
  const { usuario } = useAuth();

  // El paciente no tiene acceso a esta página
  if (usuario.rol === 'paciente') return null;

  const esAdmin = usuario.rol === 'admin';

  return (
    <>
      <h1>Pacientes</h1>
      <p className="sub">
        {esAdmin
          ? 'Puedes ver todos los pacientes y asignar coaches.'
          : 'Ves solo tus pacientes asignados.'}
      </p>

      <div className="bar">
        <button className="btn pri">Registrar nuevo paciente</button>
      </div>

      <div className="grid2">
        <div className="card kpi">
          <b>—</b>
          <span>Total de pacientes (pendiente de conectar)</span>
        </div>
        <div className="card">
          <h2>Tu acceso</h2>
          <span className={'badge ' + (esAdmin ? 'c-ochre' : 'c-sage')}>
            {esAdmin ? 'Modo admin' : 'Modo coach'}
          </span>
        </div>
      </div>
    </>
  );
}
