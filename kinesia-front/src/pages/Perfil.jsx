import { useRef, useState } from 'react';
import { Avatar, Badge, Chart, Gauge, Leyenda, Mensaje, Modal } from '../components/ui';
import PlanCalorico from '../components/PlanCalorico';
import {
  useCrearSesion, useEliminarUsuario,
  useEstadisticas,
  useRutinas,
  useSesionesUsuario,
  useSubirFotoUsuario,
  useUsuario,
} from '../lib/queries';
import { avg, fmtFecha, porFecha, prec, reps } from '../lib/utils';

function NuevaSesion({ usuarioId, onClose, onOk }) {
  const rutinas = useRutinas();
  const crear = useCrearSesion();
  const [f, setF] = useState({ rutinaId: '', repeticiones: 12, precisionPromedio: '', observaciones: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const enviar = (e) => {
    e.preventDefault();
    crear.mutate(
      {
        usuarioId: Number(usuarioId),
        rutinaId: Number(f.rutinaId),
        fecha: new Date().toISOString(),
        repeticiones: Number(f.repeticiones),
        precisionPromedio: Number(f.precisionPromedio),
        observaciones: f.observaciones.trim() || undefined,
      },
      { onSuccess: onOk }
    );
  };
  return (
    <Modal titulo="Registrar sesión" onClose={onClose}>
      <form onSubmit={enviar}>
        <label className="field">Rutina
          <select className="input" required value={f.rutinaId} onChange={set('rutinaId')}>
            <option value="">Elige una rutina</option>
            {rutinas.data?.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </select>
        </label>
        <label className="field">Repeticiones
          <input className="input" type="number" min="1" required value={f.repeticiones} onChange={set('repeticiones')} />
        </label>
        <label className="field">Precisión promedio (0–100)
          <input className="input" type="number" min="0" max="100" step="0.1" required value={f.precisionPromedio} onChange={set('precisionPromedio')} />
        </label>
        <label className="field">Observaciones (opcional)
          <textarea className="input" rows="2" value={f.observaciones} onChange={set('observaciones')} />
        </label>
        {crear.isError && <p className="msg-err">{crear.error.message}</p>}
        <div className="actions">
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn pri" disabled={crear.isPending}>{crear.isPending ? 'Guardando...' : 'Registrar sesión'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Perfil({ id, go, toast }) {
  const usuario = useUsuario(id);
  const sesiones = useSesionesUsuario(id);
  const stats = useEstadisticas(id);
  const eliminar = useEliminarUsuario();
  const foto = useSubirFotoUsuario();
  const [modal, setModal] = useState(null); // 'sesion' | 'plan' | 'eliminar'
  const input = useRef(null);

  if (usuario.isLoading) return <Mensaje titulo="Cargando paciente..." />;
  if (usuario.isError) {
    return (
      <>
        <button className="back" onClick={() => go('pacientes')}>← Volver a pacientes</button>
        <Mensaje error titulo={usuario.error.status === 404 ? 'Paciente no encontrado' : 'No se pudo cargar'} texto={usuario.error.message} />
      </>
    );
  }

  const u = usuario.data;
  const ses = [...(sesiones.data ?? [])].sort(porFecha);
  const valores = ses.map(prec);
  const m = avg(valores);
  const totalReps = ses.reduce((s, x) => s + reps(x), 0);
  const top = stats.data?.rutinaMasUsada;

  const cambiarFoto = (e) => {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    foto.mutate({ id: u.id, archivo }, {
      onSuccess: () => toast('Foto actualizada'),
      onError: (err) => toast(err.message),
    });
  };

  const borrar = () =>
    eliminar.mutate(u.id, {
      onSuccess: () => { toast('Paciente eliminado'); go('pacientes'); },
      onError: (err) => { setModal(null); toast(err.message); },
    });

  return (
    <>
      <button className="back" onClick={() => go('pacientes')}>← Volver a pacientes</button>
      <div className="card hero">
        <Avatar usuario={u} large />
        <div className="grow">
          <h1>{u.nombre}</h1>
          <div className="muted">{u.edad} años · {u.email}</div>
          <div className="btns">
            <button className="btn pri" onClick={() => setModal('sesion')}>Registrar sesión</button>
            <button className="btn" onClick={() => setModal('plan')}>Plan calórico</button>
            <button className="btn" disabled={foto.isPending} onClick={() => input.current?.click()}>
              {foto.isPending ? 'Subiendo...' : 'Cambiar foto'}
            </button>
            <input ref={input} type="file" accept="image/*" hidden onChange={cambiarFoto} />
            <button className="btn dng" onClick={() => setModal('eliminar')}>Eliminar paciente</button>
          </div>
        </div>
        <div className="gauge-box">
          <Gauge ang={m * 1.8} size={150} />
          <div className="muted" style={{ fontSize: 14 }}>Precisión media {m}%</div>
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <h2>Evolución de la precisión</h2>
          {sesiones.isLoading ? <p className="muted">Cargando...</p> : <Chart valores={valores} />}
          {valores.length > 0 && <Leyenda />}
        </div>
        <div className="card">
          <h2>Sesiones</h2>
          <p className="muted" style={{ marginTop: -8 }}>
            {ses.length} sesiones · {totalReps} repeticiones en total
            {top && <><br />Rutina más usada: {top.nombre} ({top.usos} veces)</>}
          </p>
          {ses.length === 0 && <p className="muted">Registra la primera sesión con el botón de arriba.</p>}
          {[...ses].reverse().map((s, i) => (
            <div className="row" key={s.id}>
              <span className="grow">
                <b>Sesión {ses.length - i}</b><br />
                <small>{s.Rutina?.nombre ?? 'Rutina'} · {fmtFecha(s.fecha)} · {reps(s)} repeticiones</small>
              </span>
              <Badge v={prec(s)} />
            </div>
          ))}
        </div>
      </div>

      {modal === 'sesion' && (
        <NuevaSesion usuarioId={u.id} onClose={() => setModal(null)} onOk={() => { setModal(null); toast('Sesión registrada'); }} />
      )}
      {modal === 'plan' && (
        <PlanCalorico usuario={u} onClose={() => setModal(null)} toast={toast} />
      )}
      {modal === 'eliminar' && (
        <Modal titulo={`¿Eliminar a ${u.nombre}?`} onClose={() => setModal(null)}>
          <p className="muted">También se borrarán sus {ses.length} sesiones registradas. Esta acción no se puede deshacer.</p>
          <div className="actions">
            <button className="btn" onClick={() => setModal(null)}>Cancelar</button>
            <button className="btn dng fill" disabled={eliminar.isPending} onClick={borrar}>
              {eliminar.isPending ? 'Eliminando...' : 'Eliminar paciente'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}