import { useState, useEffect, useCallback, type CSSProperties } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { nivel } from '../lib/utils';
import { Leyenda } from '../components/ui';
import PlanCalorico from '../components/PlanCalorico';
import Perfil from './Perfil';
import type { Sesion } from '../lib/types';

// clase de color + texto según el estado de la carga
const ESTADOS: Record<string, [string, string]> = {
  cargando: ['c-ember', 'Conectando...'],
  ok: ['c-sage', 'Conectado'],
  error: ['c-fault', 'Sin conexión'],
};

export default function MiPanel({ toast }: { toast?: (msg: string) => void }) {
  const { usuario } = useAuth();
  const usuarioId = usuario?.id;
  const [estado, setEstado] = useState('cargando');
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [verPlan, setVerPlan] = useState(false);

  const cargarDatos = useCallback(async () => {
    if (!usuarioId) return;
    try {
      const data = await api('/api/sesiones/usuario/' + usuarioId);
      setSesiones(Array.isArray(data) ? (data as Sesion[]) : []);
      setEstado('ok');
    } catch (err) {
      console.error('Error cargando MiPanel:', err);
      setEstado('error');
    }
  }, [usuarioId]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const total = sesiones.length;
  const promedio = total > 0
    ? Math.round((sesiones.reduce((sum, s) => sum + (s.precisionPromedio || 0), 0) / total) * 10) / 10
    : 0;
  const [claseEstado, textoEstado] = ESTADOS[estado];

  if (!usuario) return null;

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
        <div className="card kpi" style={{ '--c': total > 0 ? nivel(promedio)[0] : 'var(--root)' } as CSSProperties}>
          <b>{estado === 'ok' ? `${promedio}%` : '—'}</b>
          <span>Precisión promedio</span>
        </div>
        <div className="card kpi c-ember">
          <h2>Plan calórico</h2>
          <button className="btn" onClick={() => setVerPlan(true)}>Ver plan</button>
        </div>
      </div>

      <Leyenda />

      <h2 className="seccion">Mi perfil</h2>
      <Perfil id={usuarioId} go={() => {}} toast={toast} embebido onSesionCreada={cargarDatos} />
      {verPlan && <PlanCalorico usuario={usuario} toast={toast} onClose={() => setVerPlan(false)} />}
    </>
  );
}
