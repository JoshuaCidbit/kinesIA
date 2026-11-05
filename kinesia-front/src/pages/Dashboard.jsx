import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { go } from './App';

export default function Dashboard({ go }) {
  const { usuario } = useAuth();

  // Solo coach y admin ven el dashboard
  if (usuario.rol === 'paciente') return null;

  const [estadisticas, setEstadisticas] = useState(null);

  useEffect(() => {
    const cargarEstadisticas = async () => {
      try {
        const sesiones = await api('/api/sesiones');
        const total = sesiones.length;
        const promedio = total > 0 ? sesiones.reduce((sum, s) => sum + (s.precisionPromedio || 0), 0) / total : 0;
        setEstadisticas({ total, promedio });
      } catch (err) {
        console.error('Error cargando estadísticas:', err);
      }
    };
    cargarEstadisticas();
  }, [usuario.id]);

  return (
    <div>
      <h2>Dashboard</h2>
      {usuario.rol === 'coach' && <p>Soy coach con {estadisticas?.total} sesiones registradas</p>}
      {usuario.rol === 'admin' && <p>Soy administrador</p>}
      <p>Bienvenido/a, {usuario.nombre}</p>
      <button onClick={() => go('pacientes')}>Ver pacientes</button>
      <button onClick={() => go('rutinas')}>Ver rutinas</button>
    </div>
  );
}