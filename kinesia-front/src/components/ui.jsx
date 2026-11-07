import { useEffect, useRef } from 'react';
import { colorDe, ini, nivel } from '../lib/utils';

const IC = {
  d: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z',
  u: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  r: 'M6.5 6.5l11 11M21 21l-1-1M3 3l1 1M18 22l4-4M2 6l4-4M3 10l7-7M14 21l7-7',
};

export const Ico = ({ k }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={IC[k]} />
  </svg>
);

export function Avatar({ usuario, large }) {
  return (
    <span className={'av' + (large ? ' lg' : '')} style={{ '--c': colorDe(usuario.id) }}>
      {usuario.fotoUrl ? <img src={usuario.fotoUrl} alt={usuario.nombre} /> : ini(usuario.nombre)}
    </span>
  );
}

export function Badge({ v }) {
  const [c, t] = nivel(v);
  return <span className="badge" style={{ '--c': c }}>{Math.round(v)}% · {t}</span>;
}

// Rol con color semántico: paciente (verde), coach (azul), admin (rojo terracota)
export function Rol({ r }) {
  const color = r === 'admin' ? 'var(--admin)' : r === 'coach' ? 'var(--coach)' : 'var(--patient)';
  const label = r === 'admin' ? 'Admin' : r === 'coach' ? 'Coach' : 'Paciente';
  return <span className="badge" style={{ '--c': color }}>{label}</span>;
}

export function Gauge({ ang, size = 140 }) {
  const g = Math.max(0, Math.min(Number(ang) || 0, 179.9));
  const a = (g * Math.PI) / 180;
  const x = 60 - 48 * Math.cos(a);
  const y = 60 - 48 * Math.sin(a);
  return (
    <svg width={size} style={{ maxWidth: '100%', height: 'auto' }} viewBox="0 0 120 72" role="img" aria-label={`Ángulo ${Math.round(ang)} grados`}>
      <path d="M12 60A48 48 0 0 1 108 60" fill="none" stroke="var(--vein)" strokeWidth="9" strokeLinecap="round" />
      <path d={`M12 60A48 48 0 0 1 ${x} ${y}`} fill="none" stroke="var(--root)" strokeWidth="11" strokeLinecap="round" />
      <text x="60" y="58" textAnchor="middle" fontSize="26" fontWeight="700" fill="var(--ink)">{Math.round(ang)}°</text>
    </svg>
  );
}

// valores: precisiones (0-100) ordenadas por fecha
export function Chart({ valores }) {
  if (!valores.length) return <p className="muted">Aún no hay sesiones registradas.</p>;
  const W = 560, H = 210, pl = 36, pr = 12, pt = 12, pb = 26, n = valores.length;
  const lo = Math.min(50, Math.floor(Math.min(...valores) / 10) * 10);
  const X = (i) => pl + (n === 1 ? (W - pl - pr) / 2 : (i * (W - pl - pr)) / (n - 1));
  const Y = (v) => pt + ((100 - v) / (100 - lo)) * (H - pt - pb);
  const pts = valores.map((v, i) => [X(i), Y(v)]);
  return (
    <div className="scroll">
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: 420 }} role="img" aria-label="Precisión por sesión">
        <title>Precisión por sesión</title>
        {[lo, 70, 85, 100].map((v) => (
          <g key={v}>
            <line x1={pl} x2={W - pr} y1={Y(v)} y2={Y(v)} stroke="var(--vein)" strokeDasharray={v === 70 || v === 85 ? '4 4' : '0'} />
            <text x={pl - 8} y={Y(v) + 4} textAnchor="end" fontSize="11" fill="var(--ink-soft)">{v}</text>
          </g>
        ))}
        <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="var(--root)" strokeWidth="2.5" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p[0]} cy={p[1]} r="6" fill={nivel(valores[i])[0]} stroke="var(--bone)" strokeWidth="2" />
            <text x={p[0]} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--ink-soft)">S{i + 1}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export const Leyenda = () => (
  <div className="legend">
    <span><i style={{ background: 'var(--sage)' }} />Buena (85+)</span>
    <span><i style={{ background: 'var(--ember)' }} />Regular (70–84)</span>
    <span><i style={{ background: 'var(--fault)' }} />Baja</span>
  </div>
);

export function Modal({ titulo, children, onClose, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    const el = ref.current;
    if (el) el.focus();
    const h = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'Tab') {
        const focos = el?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!focos?.length) return;
        const primero = focos[0];
        const ultimo = focos[focos.length - 1];
        if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
        else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
      }
    };
    addEventListener('keydown', h);
    return () => { removeEventListener('keydown', h); prev?.focus?.(); };
  }, [onClose]);
  return (
    <div className="modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} tabIndex={-1} className={`card ${className}`.trim()}>
        <h2>{titulo}</h2>
        {children}
      </div>
    </div>
  );
}

export function Mensaje({ titulo, texto, error }) {
  return (
    <div className="card empty">
      <b style={error ? { color: 'var(--fault)' } : undefined}>{titulo}</b>
      {texto && <p className="muted">{texto}</p>}
    </div>
  );
}