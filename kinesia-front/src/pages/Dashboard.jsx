import { useState } from 'react';
import { useUsuarios, useSesiones } from '../lib/queries';
import { Avatar, Badge, Chart, Leyenda, Mensaje } from '../components/ui';
import { avg, prec, reps, porFecha } from '../lib/utils';

export default function Dashboard({ go }) {
  const usuarios = useUsuarios();
  const sesiones = useSesiones();
  const [elegido, setElegido] = useState('');

  if (usuarios.isLoading || sesiones.isLoading) return <Mensaje titulo="Cargando resumen..." />;
  const err = usuarios.error || sesiones.error;
  if (err) return <Mensaje error titulo="No se pudo cargar el resumen" texto={err.message} />;

  const us = usuarios.data ?? [];
  const ss = sesiones.data ?? [];
  const porUsuario = us.map((u) => ({
    u,
    ses: ss.filter((s) => Number(s.usuarioId) === Number(u.id)).sort(porFecha),
  }));
  const foco =
    porUsuario.find((x) => String(x.u.id) === elegido) ??
    [...porUsuario].sort((a, b) => b.ses.length - a.ses.length)[0];
  const recientes = porUsuario
    .filter((x) => x.ses.length)
    .sort((a, b) => porFecha(b.ses.at(-1), a.ses.at(-1)));

  return (
    <>
      <h1>Resumen</h1>
      <p className="sub">Pacientes y sesiones registradas en KinesIA.</p>

      <div className="grid3">
        <div className="card kpi" style={{ '--c': 'var(--primary)' }}><b>{us.length}</b><span>Pacientes</span></div>
        <div className="card kpi" style={{ '--c': 'var(--ochre)' }}><b>{ss.length}</b><span>Sesiones registradas</span></div>
        <div className="card kpi" style={{ '--c': 'var(--sage)' }}><b>{ss.length ? avg(ss.map(prec)) + '%' : '—'}</b><span>Precisión media</span></div>
      </div>

      {us.length === 0 ? (
        <Mensaje titulo="Aún no hay pacientes" texto="Registra el primero desde la sección Pacientes." />
      ) : (
        <div className="grid2">
          <div className="card">
            <h2>Precisión de</h2>
            <select className="input" style={{ marginBottom: 14 }} value={String(foco.u.id)} onChange={(e) => setElegido(e.target.value)} aria-label="Paciente">
              {us.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
            </select>
            <Chart valores={foco.ses.map(prec)} />
            <Leyenda />
          </div>
          <div className="card">
            <h2>Última sesión por paciente</h2>
            {recientes.length === 0 && <p className="muted">Todavía no hay sesiones.</p>}
            {recientes.map(({ u, ses }) => {
              const s = ses.at(-1);
              return (
                <button key={u.id} className="row" onClick={() => go('paciente-' + u.id)}>
                  <Avatar usuario={u} />
                  <span className="grow"><b>{u.nombre}</b><br /><small>{reps(s)} repeticiones</small></span>
                  <Badge v={prec(s)} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
