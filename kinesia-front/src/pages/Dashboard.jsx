import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { nivel } from '../lib/utils';
import { Leyenda } from '../components/ui';

export default function Dashboard({ go }) {
  const { usuario } = useAuth();
  const [estadisticas, setEstadisticas] = useState(null);
  const [error, setError] = useState(false);

  // Solo coach y admin ven el dashboard
  const esPaciente = usuario.rol === 'paciente';

  useEffect(() => {
    if (esPaciente) return;
    const cargarEstadisticas = async () => {
      try {
        const sesiones = await api('/api/sesiones');
        const total = sesiones.length;
        const suma = sesiones.reduce((sum, s) => sum + (s.precisionPromedio || 0), 0);
        const promedio = total > 0 ? Math.round((suma / total) * 10) / 10 : 0;
        setEstadisticas({ total, promedio });
      } catch (err) {
        console.error('Error cargando estadísticas:', err);
        setError(true);
      }
    };
    cargarEstadisticas();
  }, [usuario.id, esPaciente]);

  if (esPaciente) return null;

  const total = estadisticas?.total ?? 0;
  const promedio = estadisticas?.promedio ?? 0;
  const colorPrecision = total > 0 ? nivel(promedio)[0] : 'var(--root)';
  const esAdmin = usuario.rol === 'admin';

  return (
    <>
      <h1>Resumen</h1>
      <p className="sub">Bienvenido/a, {usuario.nombre}</p>

      {error && <p className="msg-err">No se pudieron cargar las estadísticas.</p>}

      <div className="grid3">
        <div className="card kpi">
          <b>{total}</b>
          <span>Sesiones totales</span>
        </div>
        <div className="card kpi" style={{ '--c': colorPrecision }}>
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
