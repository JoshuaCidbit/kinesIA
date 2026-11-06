import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api, usuarios } from '../lib/api';
import { Avatar, Mensaje } from '../components/ui';
import PlanCalorico from '../components/PlanCalorico';
import FormSesion from '../components/FormSesion';

const CLASE_ROL = { admin: 'c-ochre', coach: 'c-sage', paciente: 'c-primary' };

export default function Perfil({ id, go, toast, embebido = false, onSesionCreada }) {
  const { usuario } = useAuth();
  const esPaciente = usuario.rol === 'paciente';
  const esCoach = usuario.rol === 'coach';
  const esAdmin = usuario.rol === 'admin';
  const pacienteId = id || usuario.id;

  const [paciente, setPaciente] = useState(null);
  const [verPlan, setVerPlan] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const inputFoto = useRef(null);

  const cargar = useCallback(async () => {
    try {
      setPaciente(await api(`/api/usuarios/${pacienteId}`));
    } catch (err) {
      console.error('Error cargando perfil:', err);
      if (err.status === 403) toast?.('No tienes acceso a este paciente');
    }
  }, [pacienteId]);

  useEffect(() => { cargar(); }, [cargar]);

  if (!paciente) return <Mensaje titulo="Cargando perfil..." />;

  const rolPerfil = paciente.rol ?? 'paciente';
  const Titulo = embebido ? 'h2' : 'h1';

  const quitarCoach = () =>
    api(`/api/usuarios/${pacienteId}/coach`, { method: 'PUT', body: { coachId: null } })
      .then(() => { toast?.('Coach quitado'); cargar(); })
      .catch((err) => toast?.(err.message));

  const subirFoto = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      await usuarios.subirFoto(pacienteId, f);
      toast?.('Foto actualizada');
      await cargar();
    } catch (err) { toast?.(err.message); }
    e.target.value = '';
  };

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
              <input ref={inputFoto} type="file" accept="image/*" hidden onChange={subirFoto} />
              <button className="btn" onClick={() => inputFoto.current?.click()}>Cambiar foto</button>
              <button className="btn" onClick={() => setVerPlan(true)}>Plan calórico</button>
              <button className="btn pri" onClick={() => setRegistrando(true)}>Registrar sesión</button>
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
            <p>Coach asignado: <span className="muted">{paciente.coach?.nombre ?? 'sin coach'}</span></p>
            <div className="btns">
              <button className="btn dng" onClick={quitarCoach}>Quitar coach</button>
              <button className="btn">Restablecer contraseña</button>
            </div>
          </div>
        )}
      </div>

      {verPlan && <PlanCalorico usuario={paciente} toast={toast} onClose={() => setVerPlan(false)} />}
      {registrando && (
        <FormSesion
          usuario={paciente}
          toast={toast}
          onClose={() => setRegistrando(false)}
          onCreada={onSesionCreada}
        />
      )}
    </>
  );
}