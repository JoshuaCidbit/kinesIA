import { type CSSProperties } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { nivel } from '../lib/utils';
import { useSesiones } from '../lib/queries';
import { Leyenda } from '../components/ui';
import type { Sesion } from '../lib/types';

export default function Dashboard({ go }: { go: (v: string) => void }) {
  const { usuario } = useAuth();

  // Solo coach y admin ven el dashboard
  const esPaciente = usuario?.rol === 'paciente';

  const sesionesQ = useSesiones(!esPaciente);
  const sesiones = (sesionesQ.data ?? []) as Sesion[];
  const total = sesiones.length;
  const suma = sesiones.reduce((sum, s) => sum + (s.precisionPromedio || 0), 0);
  const promedio = total > 0 ? Math.round((suma / total) * 10) / 10 : 0;
  const error = sesionesQ.isError;

  if (esPaciente) return null;

  const colorPrecision = total > 0 ? nivel(promedio)[0] : 'var(--root)';
  const esAdmin = usuario?.rol === 'admin';

  return (
    <>
      <h1>Resumen</h1>
      <p className="sub">Bienvenido/a, {usuario?.nombre}</p>

      {error && <p className="msg-err">No se pudieron cargar las estadísticas.</p>}

      <div className="grid3">
        <div className="card kpi">
          <b>{total}</b>
          <span>Sesiones totales</span>
        </div>
        <div className="card kpi" style={{ '--c': colorPrecision } as CSSProperties}>
          <b>{promedio}%</b>
          <span>Precisión promedio</span>
        </div>
        <div className={'card kpi ' + (esAdmin ? 'c-ember' : 'c-sage')}>
          <span className={'badge ' + (esAdmin ? 'c-ember' : 'c-sage')}>
            {esAdmin ? 'Modo admin' : 'Coach activo'}
          </span>
          <p className="muted">
            {esAdmin ? 'Ves todos los pacientes y asignas coaches.' : 'Ves solo tus pacientes asignados.'}
          </p>
        </div>
      </div>

      <div className="bar">
        <button className="btn pri" onClick={() => go('pacientes')}>Ver pacientes</button>
        <button className="btn" onClick={() => go('rutinas')}>Ver rutinas</button>
      </div>

      <Leyenda />
    </>
  );
}
