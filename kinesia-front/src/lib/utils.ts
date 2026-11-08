export const COLORES = ['#945B34', '#5C6F5E', '#B5473A', '#8A6A1E', '#4A5A7A'];

export const colorDe = (id: number | string | null | undefined) =>
  COLORES[Math.abs(Number(id) || 0) % COLORES.length];

export const avg = (a: number[]) => (a.length ? Math.round(a.reduce((s, x) => s + x, 0) / a.length) : 0);

export const ini = (n = '') =>
  n
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0])
    .join('')
    .toUpperCase();

// Postgres puede devolver DECIMAL como string, por eso Number()
export const prec = (s: { precisionPromedio?: number | string | null }) => Number(s.precisionPromedio) || 0;

export const reps = (s: { repeticiones?: number | string | null }) => Number(s.repeticiones) || 0;

export const porFecha = (a: { fecha: string }, b: { fecha: string }) =>
  new Date(a.fecha).getTime() - new Date(b.fecha).getTime();

export const fmtFecha = (f?: string | null) =>
  f ? new Date(f).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export const nivel = (v: number) =>
  v >= 85 ? ['var(--sage)', 'Buena'] : v >= 70 ? ['var(--ember)', 'Regular'] : ['var(--fault)', 'Baja'];
