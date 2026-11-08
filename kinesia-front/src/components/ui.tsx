import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from 'react';
import { colorDe, ini, nivel } from '../lib/utils';
import type { Usuario } from '../lib/types';

const IC: Record<string, string> = {
  d: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z',
  u: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  r: 'M6.5 6.5l11 11M21 21l-1-1M3 3l1 1M18 22l4-4M2 6l4-4M3 10l7-7M14 21l7-7',
};

export const Ico = ({ k }: { k: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={IC[k] ?? IC.d} />
  </svg>
);

export function Avatar({ usuario, large }: { usuario: Usuario; large?: boolean }) {
  return (
    <span className={'av' + (large ? ' lg' : '')} style={{ '--c': colorDe(usuario.id) } as CSSProperties}>
      {usuario.fotoUrl ? <img src={usuario.fotoUrl} alt={usuario.nombre} /> : ini(usuario.nombre)}
    </span>
  );
}

export function Badge({ v }: { v: number }) {
  const [c, t] = nivel(v);
  return <span className="badge" style={{ '--c': c } as CSSProperties}>{Math.round(v)}% · {t}</span>;
}

// Rol con color semántico: paciente (verde), coach (azul), admin (rojo terracota)
export function Rol({ r }: { r: string }) {
  const color = r === 'admin' ? 'var(--admin)' : r === 'coach' ? 'var(--coach)' : 'var(--patient)';
  const label = r === 'admin' ? 'Admin' : r === 'coach' ? 'Coach' : 'Paciente';
  return <span className="badge" style={{ '--c': color } as CSSProperties}>{label}</span>;
}

export function Gauge({ ang, size = 140 }: { ang: number; size?: number }) {
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
export function Chart({ valores }: { valores: number[] }) {
  if (!valores.length) return <p className="muted">Aún no hay sesiones registradas.</p>;
  const W = 560, H = 210, pl = 36, pr = 12, pt = 12, pb = 26, n = valores.length;
  const lo = Math.min(50, Math.floor(Math.min(...valores) / 10) * 10);
  const X = (i: number) => (n === 1 ? pl + (W - pl - pr) / 2 : pl + (i * (W - pl - pr)) / (n - 1));
  const Y = (v: number) => pt + ((100 - v) / (100 - lo)) * (H - pt - pb);
  const pts = valores.map((v, i) => [X(i), Y(v)] as const);
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

interface ModalProps {
  titulo: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}

export function Modal({ titulo, children, onClose, className = '' }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const uid = useId();
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current;
    if (el) el.focus();
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'Tab') {
        const focos = Array.from(
          el?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? [],
        ) as HTMLElement[];
        if (focos.length === 0) return;
        const primero = focos[0];
        const ultimo = focos[focos.length - 1];
        if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
        else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
      }
    };
    addEventListener('keydown', h);
    return () => { removeEventListener('keydown', h); prev?.focus(); };
  }, [onClose]);

  return (
    <div className="modal" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={`${uid}-titulo`} className={`card ${className}`.trim()}>
        <h2 id={`${uid}-titulo`}>{titulo}</h2>
        {children}
      </div>
    </div>
  );
}

export function Mensaje({ titulo, texto, error }: { titulo: string; texto?: string; error?: boolean }) {
  return (
    <div className="card empty">
      <b style={error ? { color: 'var(--fault)' } : undefined}>{titulo}</b>
      {texto && <p className="muted">{texto}</p>}
    </div>
  );
}
