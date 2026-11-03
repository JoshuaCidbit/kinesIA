import { useState } from 'react';
import { useUsuarios, useSesiones, useCrearUsuario } from '../lib/queries';
import { Avatar, Badge, Modal, Mensaje } from '../components/ui';
import { prec, porFecha } from '../lib/utils';

function NuevoPaciente({ onClose, onOk }) {
  const crear = useCrearUsuario();
  const [f, setF] = useState({ nombre: '', email: '', edad: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const enviar = (e) => {
    e.preventDefault();
    crear.mutate(
      { nombre: f.nombre.trim(), email: f.email.trim(), edad: Number(f.edad) },
      { onSuccess: onOk }
    );
  };
  return (
    <Modal titulo="Registrar paciente" onClose={onClose}>
      <form onSubmit={enviar}>
        <label className="field">Nombre completo<input className="input" required value={f.nombre} onChange={set('nombre')} /></label>
        <label className="field">Correo<input className="input" type="email" required value={f.email} onChange={set('email')} /></label>
        <label className="field">Edad<input className="input" type="number" min="1" max="120" required value={f.edad} onChange={set('edad')} /></label>
        {crear.isError && <p className="msg-err">{crear.error.message}</p>}
        <div className="actions">
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn pri" disabled={crear.isPending}>{crear.isPending ? 'Guardando...' : 'Registrar paciente'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Pacientes({ go, toast }) {
  const usuarios = useUsuarios();
  const sesiones = useSesiones();
  const [q, setQ] = useState('');
  const [nuevo, setNuevo] = useState(false);

  const us = usuarios.data ?? [];
  const lista = us.filter((u) => u.nombre.toLowerCase().includes(q.toLowerCase()));
  const sesDe = (id) => (sesiones.data ?? []).filter((s) => Number(s.usuarioId) === Number(id)).sort(porFecha);

  return (
    <>
      <h1>Pacientes</h1>
      <p className="sub">{us.length} pacientes registrados.</p>
      <div className="bar">
        <input type="search" placeholder="Buscar por nombre" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar paciente" />
        <button className="btn pri" onClick={() => setNuevo(true)}>Registrar paciente</button>
      </div>

      {usuarios.isLoading && <Mensaje titulo="Cargando pacientes..." />}
      {usuarios.isError && <Mensaje error titulo="No se pudieron cargar los pacientes" texto={usuarios.error.message} />}
      {usuarios.isSuccess && lista.length === 0 && (
        <Mensaje titulo="No hay coincidencias" texto="Prueba con otro nombre o registra un paciente nuevo." />
      )}

      <div className="cards">
        {lista.map((u) => {
          const ses = sesDe(u.id);
          const ultima = ses.at(-1);
          return (
            <button key={u.id} className="card pcard" onClick={() => go('paciente-' + u.id)}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <Avatar usuario={u} />
                <span><b>{u.nombre}</b><br /><small className="muted">{u.edad} años</small></span>
              </div>
              <div className="muted" style={{ fontSize: 14 }}>{ultima?.Rutina?.nombre ?? 'Sin rutina asignada'}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <small className="muted">{ses.length} sesiones</small>
                {ultima && <Badge v={prec(ultima)} />}
              </div>
            </button>
          );
        })}
      </div>

      {nuevo && (
        <NuevoPaciente
          onClose={() => setNuevo(false)}
          onOk={() => { setNuevo(false); toast('Paciente registrado'); }}
        />
      )}
    </>
  );
}
