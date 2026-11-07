import { useState } from 'react';
import { useRutinas, useSesiones, useCrearRutina, useActualizarRutina, useEliminarRutina } from '../lib/queries';
import { Gauge, Modal, Mensaje } from '../components/ui';

function FormRutina({ inicial, onClose, onOk }) {
  const crear = useCrearRutina();
  const actualizar = useActualizarRutina();
  const op = inicial ? actualizar : crear;
  const [f, setF] = useState({
    nombre: inicial?.nombre ?? '',
    descripcion: inicial?.descripcion ?? '',
    anguloObjetivo: inicial?.anguloObjetivo ?? '',
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const enviar = (e) => {
    e.preventDefault();
    const data = { nombre: f.nombre.trim(), descripcion: f.descripcion.trim(), anguloObjetivo: Number(f.anguloObjetivo) };
    if (inicial) actualizar.mutate({ id: inicial.id, data }, { onSuccess: onOk });
    else crear.mutate(data, { onSuccess: onOk });
  };
  return (
    <Modal titulo={inicial ? 'Editar rutina' : 'Crear rutina'} onClose={onClose}>
      <form onSubmit={enviar}>
        <label className="field">Nombre<input className="input" required value={f.nombre} onChange={set('nombre')} /></label>
        <label className="field">Descripción<textarea className="input" rows="2" required value={f.descripcion} onChange={set('descripcion')} /></label>
        <label className="field">Ángulo objetivo (0–180°)
          <input className="input" type="number" min="0" max="180" required value={f.anguloObjetivo} onChange={set('anguloObjetivo')} />
        </label>
        {op.isError && <p className="msg-err">{op.error.message}</p>}
        <div className="actions">
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn pri" disabled={op.isPending}>{op.isPending ? 'Guardando...' : 'Guardar rutina'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Rutinas({ toast }) {
  const rutinas = useRutinas();
  const sesiones = useSesiones();
  const eliminar = useEliminarRutina();
  const [modal, setModal] = useState(null); // { tipo: 'form' | 'borrar', rutina? }

  const usos = (id) => (sesiones.data ?? []).filter((s) => Number(s.rutinaId) === Number(id)).length;

  const pedirBorrar = (r) => {
    const n = usos(r.id);
    if (n > 0) {
      toast(`No se puede eliminar: la rutina tiene ${n} sesiones asociadas. Elimina o reasigna esas sesiones primero.`);
    } else {
      setModal({ tipo: 'borrar', rutina: r });
    }
  };

  const borrar = () =>
    eliminar.mutate(modal.rutina.id, {
      onSuccess: () => { setModal(null); toast('Rutina eliminada'); },
      onError: (err) => { setModal(null); toast(err.message); }, // 409 si el servidor detecta sesiones
    });

  return (
    <>
      <h1>Rutinas</h1>
      <p className="sub">El arco muestra el ángulo objetivo de cada ejercicio.</p>
      <div className="bar"><button className="btn pri" onClick={() => setModal({ tipo: 'form' })}>Crear rutina</button></div>

      {rutinas.isLoading && <Mensaje titulo="Cargando rutinas..." />}
      {rutinas.isError && <Mensaje error titulo="No se pudieron cargar las rutinas" texto={rutinas.error.message} />}
      {rutinas.isSuccess && rutinas.data.length === 0 && <Mensaje titulo="Aún no hay rutinas" texto="Crea la primera con el botón de arriba." />}

      <div className="cards">
        {rutinas.data?.map((r) => {
          const n = usos(r.id);
          return (
            <div key={r.id} className="card pcard">
              <div className="gauge-wrap">
                <Gauge ang={r.anguloObjetivo} />
              </div>
              <b>{r.nombre}</b>
              <span className="muted desc">{r.descripcion}</span>
              <small className="muted">{n > 0 ? `${n} sesiones asociadas` : 'Sin sesiones asociadas'}</small>
              <div className="btns">
                <button className="btn" onClick={() => setModal({ tipo: 'form', rutina: r })}>Editar</button>
                <button className="btn dng" onClick={() => pedirBorrar(r)}>Eliminar</button>
              </div>
            </div>
          );
        })}
      </div>

      {modal?.tipo === 'form' && (
        <FormRutina
          inicial={modal.rutina}
          onClose={() => setModal(null)}
          onOk={() => { setModal(null); toast(modal.rutina ? 'Rutina actualizada' : 'Rutina creada'); }}
        />
      )}
      {modal?.tipo === 'borrar' && (
        <Modal titulo={`¿Eliminar "${modal.rutina.nombre}"?`} onClose={() => setModal(null)}>
          <p className="muted">Esta acción no se puede deshacer.</p>
          <div className="actions">
            <button className="btn" onClick={() => setModal(null)}>Cancelar</button>
            <button className="btn dng fill" disabled={eliminar.isPending} onClick={borrar}>
              {eliminar.isPending ? 'Eliminando...' : 'Eliminar rutina'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
