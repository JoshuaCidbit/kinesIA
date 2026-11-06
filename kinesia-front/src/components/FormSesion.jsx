import { useState, useEffect } from 'react';
import { Modal } from './ui';
import { rutinas, sesiones } from '../lib/api';

export default function FormSesion({ usuario, toast, onClose, onCreada }) {
  const [lista, setLista] = useState([]);
  const [rutinaId, setRutinaId] = useState('');
  const [repeticiones, setRepeticiones] = useState('');
  const [precision, setPrecision] = useState('');
  const [obs, setObs] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    rutinas.listar()
      .then((r) => setLista(Array.isArray(r) ? r : []))
      .catch(() => setLista([]));
  }, []);

  const enviar = async (e) => {
    e.preventDefault();
    const reps = Number(repeticiones);
    const prec = Number(precision);
    if (!rutinaId) return toast?.('Elige el ejercicio');
    if (!Number.isInteger(reps) || reps < 1) return toast?.('Repeticiones inválidas');
    if (!Number.isFinite(prec) || prec < 0 || prec > 100) return toast?.('El porcentaje debe ser de 0 a 100');

    setEnviando(true);
    try {
      await sesiones.crear({
        usuarioId: usuario.id,
        rutinaId: Number(rutinaId),
        fecha: new Date().toISOString(),
        repeticiones: reps,
        precisionPromedio: prec,
        observaciones: obs.trim() || undefined,
      });
      toast?.('Sesión registrada');
      onCreada?.();
      onClose?.();
    } catch (err) {
      toast?.(err.message || 'No se pudo registrar');
    } finally { setEnviando(false); }
  };

  return (
    <Modal titulo="Registrar sesión" onClose={onClose} className="form-modal">
      <form onSubmit={enviar}>
        <div className="form-group">
          <label>Ejercicio *</label>
          <select className="input" value={rutinaId} onChange={(e) => setRutinaId(e.target.value)} required>
            <option value="">Selecciona una rutina</option>
            {lista.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Repeticiones *</label>
          <input className="input" type="number" min="1" step="1" required value={repeticiones} onChange={(e) => setRepeticiones(e.target.value)} />
        </div>
        <div className="form-group">
          <label>¿Qué tan bien lo hiciste? (%) *</label>
          <input className="input" type="number" min="0" max="100" step="0.1" required value={precision} onChange={(e) => setPrecision(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Observaciones</label>
          <input className="input" value={obs} onChange={(e) => setObs(e.target.value)} />
        </div>
        <div className="actions">
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn pri" disabled={enviando}>{enviando ? 'Guardando...' : 'Guardar sesión'}</button>
        </div>
      </form>
    </Modal>
  );
}