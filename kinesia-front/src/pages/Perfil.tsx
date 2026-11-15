import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useActualizarCoach, useSesionesUsuario, useUsuario } from '../lib/queries';
import { Avatar, Gauge, Chart, Mensaje } from '../components/ui';
import PlanCalorico from '../components/PlanCalorico';
import FormSesion from '../components/FormSesion';
import type { Sesion } from '../lib/types';

interface PerfilProps {
  id?: number;
  go: (v: string) => void;
  toast?: (msg: string) => void;
  embebido?: boolean;
}

export default function Perfil({ id, go, toast, embebido = false }: PerfilProps) {
  const { usuario } = useAuth();
  const esPaciente = usuario?.rol === 'paciente';
  const esCoach = usuario?.rol === 'coach';
  const esAdmin = usuario?.rol === 'admin';
  const pacienteId = id ?? usuario?.id;

  const [verPlan, setVerPlan] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const quitarCoachM = useActualizarCoach();

  const pacienteQ = useUsuario(pacienteId);
  const paciente = pacienteQ.data ?? null;

  const quitarCoach = () =>
    quitarCoachM
      .mutateAsync({ id: pacienteId as number, coachId: null })
      .then(() => toast?.('Coach quitado'))
      .catch((err) => toast?.(err instanceof Error ? err.message : 'No se pudo quitar el coach'));

  const sesionesQ = useSesionesUsuario(pacienteId);
  const sesiones = (sesionesQ.data ?? []) as Sesion[];
  const ultima = sesiones[0];
  const precisions = sesiones.map((s) => s.precisionPromedio).filter((v) => v != null);
  const anguloObjetivo = ultima?.Rutina?.anguloObjetivo ?? ultima?.anguloObjetivo ?? null;
  const precision = ultima?.precisionPromedio ?? null;

  if (pacienteQ.isError) {
    return <Mensaje error titulo="No se pudo cargar el perfil" texto={pacienteQ.error.message} />;
  }
  if (!paciente) return <Mensaje titulo="Cargando perfil..." />;

  const rolPerfil = paciente.rol ?? 'paciente';
  const sub = [paciente.edad ? `${paciente.edad} años` : null, rolPerfil].filter(Boolean).join(' · ');

  return (
    <>
      {!embebido && !esPaciente && (
        <button className="back" onClick={() => go('pacientes')}>← Volver a pacientes</button>
      )}

      {/* Hero: avatar + nombre + sub */}
      <div className="card hero">
        <Avatar usuario={paciente} large />
        <div className="grow">
          {embebido ? <h2>{paciente.nombre}</h2> : <h1>{paciente.nombre}</h1>}
          <p className="muted">{sub}</p>
        </div>
      </div>

      {esPaciente && (
        <>
          {/* Arco + progreso */}
          <div className="grid2">
            <div className="card">
              <div className="gauge-box">
                {ultima && anguloObjetivo != null ? <Gauge ang={anguloObjetivo} size={170} /> : <p className="muted">Aún no hay sesiones registradas.</p>}
              </div>
              {ultima && anguloObjetivo != null && (
                <p className="muted" style={{ textAlign: 'center', margin: '0' }}>
                  {ultima.Rutina ? `Objetivo · ${ultima.Rutina.nombre}` : 'Objetivo de movimiento'}
                </p>
              )}
            </div>
            <div className="card">
              <h2>Tu progreso</h2>
              {ultima ? (
                <>
                  <span className="muted">Precisión de la última sesión</span>
                  <b className="progreso-num">{Math.round(precision ?? 0)}%</b>
                  <p className="muted">{ultima.repeticiones} repeticiones · {ultima.Rutina?.nombre ?? 'el ejercicio'}</p>
                  <Chart valores={precisions} />
                </>
              ) : (
                <p className="muted">Aún no hay sesiones registradas. Registra la primera para ver tu progreso.</p>
              )}
            </div>
          </div>

          {/* Acciones */}
          <div className="bar">
            <button className="btn pri" onClick={() => setRegistrando(true)}>Registrar sesión</button>
            <button className="btn ember" onClick={() => setVerPlan(true)}>Plan calórico</button>
          </div>

          {/* Mis datos */}
          <div className="card">
            <h2>Mis datos</h2>
            <p>Email: {paciente.email}</p>
            {paciente.edad && <p>Edad: {paciente.edad}</p>}
          </div>
        </>
      )}

      {!esPaciente && (
        <div className="grid2">
          <div className="card">
            <h2>Datos</h2>
            <p>Email: {paciente.email}</p>
            {paciente.edad && <p>Edad: {paciente.edad}</p>}
          </div>
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
              <p>Coach asignado: <span className="muted">{paciente.coach?.nombre ?? 'sin coach'}</span></p>
              <div className="btns">
                <button className="btn dng" onClick={quitarCoach}>Quitar coach</button>
                <button className="btn">Restablecer contraseña</button>
              </div>
            </div>
          )}
        </div>
      )}

      {verPlan && <PlanCalorico usuario={paciente} toast={toast} onClose={() => setVerPlan(false)} />}
      {registrando && (
        <FormSesion usuario={paciente} toast={toast} onClose={() => setRegistrando(false)} />
      )}
    </>
  );
}
