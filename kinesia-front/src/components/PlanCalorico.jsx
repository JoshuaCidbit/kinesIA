import { useMemo, useState } from 'react';
import { Modal } from './ui';
import {
  useAlimentos,
  useGenerarPlanCalorico,
  useHistorialAG,
  useResultadoAG,
} from '../lib/queries';
import { fmtFecha } from '../lib/utils';

// Selección inicial equilibrada para que la demo funcione con un clic.
const PRESELECCION = [
  'pechuga-pollo', 'salmon', 'huevo', 'yogurt-griego',
  'arroz-blanco', 'avena', 'tortilla-maiz', 'camote',
  'aguacate', 'brocoli', 'manzana', 'platano',
];

const OBJETIVOS = [
  { valor: 'cut', titulo: 'Bajar grasa', detalle: 'Déficit · 27.5 kcal/kg' },
  { valor: 'bulk', titulo: 'Ganar músculo', detalle: 'Superávit · 40 kcal/kg' },
];

const medida = (a) =>
  a.porcionBase
    ? `${a.porciones} × ${a.porcionBase} ${a.unidad ?? ''}`.trim()
    : `${a.porciones} porción(es)`;

function ResultadoPlan({ plan }) {
  return (
    <div className="plan-res">
      <div className="plan-res-head">
        <h3>Plan de 5 comidas</h3>
        <span className={'plan-pill ' + (plan.cumpleRestricciones ? 'ok' : 'bad')}>
          {plan.cumpleRestricciones ? 'Cumple restricciones' : 'Ajuste incompleto'}
        </span>
      </div>

      <div className="plan-kpis">
        <div>
          <b>{Math.round(plan.caloriasObjetivo)}</b>
          <span>kcal objetivo</span>
        </div>
        <div>
          <b>{Math.round(plan.totalDiario)}</b>
          <span>kcal del plan</span>
        </div>
        <div>
          <b>{plan.rangoPorComida?.[0]}–{plan.rangoPorComida?.[1]}</b>
          <span>rango por comida</span>
        </div>
        <div>
          <b>{plan.objetivo === 'cut' ? 'Déficit' : 'Superávit'}</b>
          <span>{Number(plan.peso).toFixed(1)} kg</span>
        </div>
      </div>

      <div className="plan-comidas">
        {plan.mejorDistribucion?.map((comida) => (
          <div className="plan-comida" key={comida.comida}>
            <div className="plan-comida-head">
              <b>Comida {comida.comida}</b>
              <span className="muted">{Math.round(comida.total)} kcal</span>
            </div>
            {comida.alimentos.map((a, i) => (
              <div className="plan-item" key={`${a.id}-${i}`}>
                <span className="grow">{a.nombre}</span>
                <small className="muted">{medida(a)}</small>
                <b>{Math.round(a.calorias)}</b>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PlanCalorico({ usuario, onClose, toast }) {
  const catalogo = useAlimentos();
  const generar = useGenerarPlanCalorico(usuario.id);
  const historial = useHistorialAG(usuario.id);

  const [objetivo, setObjetivo] = useState('cut');
  const [peso, setPeso] = useState('70');
  const [seleccion, setSeleccion] = useState(null); // null = preselección
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('');
  const [verId, setVerId] = useState(null);

  const detalle = useResultadoAG(verId);
  const lista = useMemo(() => catalogo.data ?? [], [catalogo.data]);

  const porDefecto = useMemo(
    () => new Set(lista.filter((a) => PRESELECCION.includes(a.codigo)).map((a) => a.id)),
    [lista]
  );
  const elegidos = seleccion ?? porDefecto;

  const categorias = useMemo(
    () => [...new Set(lista.map((a) => a.categoria).filter(Boolean))].sort(),
    [lista]
  );

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return lista.filter(
      (a) =>
        (!categoria || a.categoria === categoria) &&
        (!q || a.nombre.toLowerCase().includes(q))
    );
  }, [lista, busqueda, categoria]);

  const alternar = (id) => {
    const s = new Set(elegidos);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    setSeleccion(s);
  };

  const seleccionarVisibles = () => {
    const s = new Set(elegidos);
    for (const a of filtrados) s.add(a.id);
    setSeleccion(s);
  };

  const enviar = (e) => {
    e.preventDefault();
    const kg = Number(peso);
    if (!Number.isFinite(kg) || kg < 20 || kg > 300) {
      toast?.('Ingresa un peso entre 20 y 300 kg');
      return;
    }
    if (elegidos.size === 0) {
      toast?.('Selecciona al menos un alimento');
      return;
    }

    setVerId(null);
    generar.mutate(
      {
        usuarioId: usuario.id,
        peso: kg,
        objetivo,
        alimentoIds: [...elegidos],
      },
      {
        onSuccess: () => {
          setVerId(null);
          toast?.('Plan calórico generado');
        },
        onError: (err) => toast?.(err.message),
      }
    );
  };

  const plan = verId ? detalle.data : generar.data;
  const cargandoPlan = verId ? detalle.isLoading : generar.isPending;

  return (
    <Modal titulo={`Plan calórico · ${usuario.nombre}`} onClose={onClose} className="plan-modal">
      <form onSubmit={enviar}>
        <div className="plan-form">
          <div>
            <span className="plan-label">Objetivo</span>
            <div className="plan-objetivos">
              {OBJETIVOS.map((o) => (
                <button
                  key={o.valor}
                  type="button"
                  className={'plan-objetivo' + (objetivo === o.valor ? ' on' : '')}
                  onClick={() => setObjetivo(o.valor)}
                >
                  <b>{o.titulo}</b>
                  <small>{o.detalle}</small>
                </button>
              ))}
            </div>
          </div>
          <label className="field" style={{ marginBottom: 0 }}>
            Peso (kg)
            <input
              className="input"
              type="number"
              min="20"
              max="300"
              step="0.1"
              value={peso}
              onChange={(e) => setPeso(e.target.value)}
              required
            />
          </label>
        </div>

        <div className="plan-tools">
          <input
            className="input"
            type="search"
            placeholder="Buscar alimento..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <select
            className="input"
            style={{ maxWidth: 180 }}
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {categorias.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button type="button" className="btn" onClick={seleccionarVisibles}>
            Añadir visibles
          </button>
          <button type="button" className="btn" onClick={() => setSeleccion(new Set())}>
            Limpiar
          </button>
        </div>

        <div className="plan-count">
          <b>{elegidos.size}</b> alimentos seleccionados
          <span className="muted"> · el AG elegirá porciones para 5 comidas</span>
        </div>

        {catalogo.isLoading && <p className="muted">Cargando catálogo de alimentos...</p>}
        {catalogo.isError && (
          <p className="msg-err">
            No se pudo cargar el catálogo: {catalogo.error.message}
          </p>
        )}

        {!catalogo.isLoading && !catalogo.isError && (
          <div className="plan-lista" role="group" aria-label="Catálogo de alimentos">
            {filtrados.length === 0 && (
              <p className="muted" style={{ padding: '12px 0' }}>No hay alimentos con ese filtro.</p>
            )}
            {filtrados.map((a) => (
              <label className="plan-food" key={a.id}>
                <input
                  type="checkbox"
                  checked={elegidos.has(a.id)}
                  onChange={() => alternar(a.id)}
                />
                <span className="grow">
                  {a.nombre}
                  {a.categoria && <><br /><small>{a.categoria}</small></>}
                </span>
                <small className="muted">
                  {Math.round(a.calorias)} kcal / {a.porcionBase} {a.unidad}
                </small>
              </label>
            ))}
          </div>
        )}

        {generar.isError && <p className="msg-err">{generar.error.message}</p>}

        <div className="actions">
          <button type="button" className="btn" onClick={onClose}>Cerrar</button>
          <button
            className="btn pri"
            disabled={generar.isPending || elegidos.size === 0}
          >
            {generar.isPending ? 'Calculando plan...' : 'Generar plan calórico'}
          </button>
        </div>
      </form>

      {cargandoPlan && <p className="muted" style={{ marginTop: 16 }}>Calculando...</p>}
      {detalle.isError && (
        <p className="msg-err">No se pudo cargar el detalle: {detalle.error.message}</p>
      )}
      {plan && !cargandoPlan && <ResultadoPlan plan={plan} />}

      {historial.data?.length > 0 && (
        <details className="plan-hist">
          <summary>Historial de planes ({historial.data.length})</summary>
          {historial.data.map((h) => (
            <div className="row" key={h.id}>
              <span className="grow">
                <b>{h.objetivo === 'cut' ? 'Déficit' : 'Superávit'}</b>
                {' · '}
                {Math.round(h.totalDiario)} / {Math.round(h.caloriasObjetivo)} kcal
                <br />
                <small>{fmtFecha(h.createdAt)} · {Number(h.peso).toFixed(1)} kg</small>
              </span>
              <button type="button" className="btn" onClick={() => setVerId(h.id)}>
                Ver
              </button>
            </div>
          ))}
        </details>
      )}
    </Modal>
  );
}
