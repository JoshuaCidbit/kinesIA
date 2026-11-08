import { useEffect, useId, useState, type FormEvent } from 'react';
import { Modal } from './ui';
import { rutinas, sesiones } from '../lib/api';
import type { Rutina, Usuario } from '../lib/types';

interface FormSesionProps {
  usuario: Usuario;
  toast?: (msg: string) => void;
  onClose: () => void;
  onCreada?: () => void;
}

export default function FormSesion({ usuario, toast, onClose, onCreada }: FormSesionProps) {
  const [lista, setLista] = useState<Rutina[]>([]);
  const [rutinaId, setRutinaId] = useState('');
  const [repeticiones, setRepeticiones] = useState('');
  const [precision, setPrecision] = useState('');
  const [obs, setObs] = useState('');
  const [enviando, setEnviando] = useState(false);
  const uid = useId();

  useEffect(() => {
    rutinas.listar()
      .then((r) => setLista(Array.isArray(r) ? (r as Rutina[]) : []))
      .catch(() => setLista([]));
  }, []);

  const enviar = async (e: FormEvent) => {
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
      toast?.(err instanceof Error ? err.message : 'No se pudo registrar');
    } finally { setEnviando(false); }
  };

  return (
    <Modal titulo="Registrar sesión" onClose={onClose} className="form-modal">
      <form onSubmit={enviar}>
        <div className="form-group">
          <label htmlFor={`${uid}-rutina`}>Ejercicio *</label>
          <select id={`${uid}-rutina`} className="input" value={rutinaId} onChange={(e) => setRutinaId(e.target.value)} required>
            <option value="">Selecciona una rutina</option>
            {lista.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor={`${uid}-reps`}>Repeticiones *</label>
          <input id={`${uid}-reps`} className="input" type="number" min="1" step="1" required value={repeticiones} onChange={(e) => setRepeticiones(e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor={`${uid}-prec`}>¿Qué tan bien lo hiciste? (%)</label>
          <input id={`${uid}-prec`} className="input" type="number" min="0" max="100" step="0.1" required value={precision} onChange={(e) => setPrecision(e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor={`${uid}-obs`}>Observaciones</label>
          <input id={`${uid}-obs`} className="input" value={obs} onChange={(e) => setObs(e.target.value)} />
        </div>
        <div className="actions">
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn pri" disabled={enviando}>{enviando ? 'Guardando...' : 'Guardar sesión'}</button>
        </div>
      </form>
    </Modal>
  );
}
