import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { nivel } from '../lib/utils';
import { Leyenda } from '../components/ui';
import Perfil from './Perfil';

// clase de color + texto según el estado de la carga
const ESTADOS = {
  cargando: ['c-ochre', 'Conectando...'],
  ok: ['c-sage', 'Conectado'],
  error: ['c-err', 'Sin conexión'],
};

export default function MiPanel({ toast }) {
  const { usuario } = useAuth();
  const [estado, setEstado] = useState('cargando');
  const [sesiones, setSesiones] = useState([]);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const data = await api('/api/sesiones/usuario/' + usuario.id);
        setSesiones(data);
        setEstado('ok');
      } catch (err) {
        console.error('Error cargando MiPanel:', err);
        setEstado('error');
      }
    };
    cargarDatos();
  }, [usuario.id]);

  const total = sesiones.length;
  const promedio = total > 0
    ? Math.round((sesiones.reduce((sum, s) => sum + (s.precisionPromedio || 0), 0) / total) * 10) / 10
    : 0;
  const [claseEstado, textoEstado] = ESTADOS[estado];

  return (
    <>
      <h1>Mi panel</h1>
      <p className="sub">
        <span className={'badge ' + claseEstado}>{textoEstado}</span>
      </p>

      <div className="grid3">
        <div className="card kpi">
          <b>{estado === 'ok' ? total : '—'}</b>
          <span>Sesiones registradas</span>
        </div>
        <div className="card kpi" style={{ '--c': total > 0 ? nivel(promedio)[0] : 'var(--primary)' }}>
          <b>{estado === 'ok' ? `${promedio}%` : '—'}</b>
          <span>Precisión promedio</span>
        </div>
        <div className="card kpi c-ochre">
          <h2>Plan calórico</h2>
          <button className="btn">Ver plan</button>
        </div>
      </div>

      <Leyenda />

      <h2 className="seccion">Mi perfil</h2>
      <Perfil id={usuario.id} go={() => {}} toast={toast} embebido />
    </>
  );
}
