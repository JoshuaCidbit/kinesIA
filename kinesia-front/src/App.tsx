import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { lazy, Suspense, useCallback, useState, type CSSProperties, type ReactNode } from 'react';
import { Ico } from './components/ui';
import { useHealth } from './lib/queries';
import { resolverVista } from './lib/rutas';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import MiCuenta from './components/MiCuenta';
import RutaGuard from './components/RutaGuard';

// Code splitting: cada vista se carga con React.lazy + Suspense para reducir el bundle inicial.
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.default })));
const Pacientes = lazy(() => import('./pages/Pacientes').then((m) => ({ default: m.default })));
const Perfil = lazy(() => import('./pages/Perfil').then((m) => ({ default: m.default })));
const Rutinas = lazy(() => import('./pages/Rutinas').then((m) => ({ default: m.default })));
const MiPanel = lazy(() => import('./pages/MiPanel').then((m) => ({ default: m.default })));

const NAV_STAFF: Array<[string, string, string]> = [
  ['dashboard', 'd', 'Resumen'],
  ['pacientes', 'u', 'Pacientes'],
  ['rutinas', 'r', 'Rutinas'],
];
const NAV_PACIENTE: Array<[string, string, string]> = [['mi-panel', 'u', 'Mi panel']];

interface VistaActualProps {
  toast: (msg: string) => void;
}

function VistaActual({ toast }: VistaActualProps) {
  const { usuario } = useAuth();
  const { pathname } = useLocation();
  const { id: idParam } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const esPaciente = usuario?.rol === 'paciente';
  const segmentos = pathname.split('/').filter(Boolean);
  const raw = esPaciente ? 'mi-panel' : segmentos[0] ?? 'dashboard';
  const vistaSolicitada = raw.startsWith('paciente-')
    ? raw
    : raw === 'pacientes' && segmentos[1]
      ? `paciente-${segmentos[1]}`
      : raw;
  const rol = usuario?.rol ?? '';
  const vista = resolverVista(vistaSolicitada, rol);

  const renderVista = (): ReactNode => {
    const fallback = <div className="card empty">Cargando…</div>;
    if (vistaSolicitada.startsWith('paciente-') && idParam) {
      return (
        <Suspense fallback={fallback}>
          <Perfil id={Number(idParam)} go={(v) => { navigate(v); scrollTo(0, 0); }} toast={toast} />
        </Suspense>
      );
    }
    if (vista === 'mi-panel') {
      return (
        <Suspense fallback={fallback}>
          <MiPanel toast={toast} />
        </Suspense>
      );
    }
    if (vista === 'dashboard') {
      return (
        <Suspense fallback={fallback}>
          <Dashboard go={(v) => { navigate(v); scrollTo(0, 0); }} />
        </Suspense>
      );
    }
    if (vista === 'pacientes') {
      return (
        <Suspense fallback={fallback}>
          <Pacientes toast={toast} />
        </Suspense>
      );
    }
    if (vista === 'rutinas') {
      return (
        <Suspense fallback={fallback}>
          <Rutinas toast={toast} />
        </Suspense>
      );
    }
    return null;
  };

  return (
    <RutaGuard rol={usuario?.rol} vista={vista}>
      {renderVista()}
    </RutaGuard>
  );
}

interface AuthedLayoutProps {
  toast: (msg: string) => void;
  aviso: string;
  onCerrarSesion: () => void;
  cuenta: boolean;
  setCuenta: (v: boolean) => void;
}

function AuthedLayout({ toast, aviso, onCerrarSesion, cuenta, setCuenta }: AuthedLayoutProps) {
  const { usuario, cargando } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const health = useHealth();

  const estado: [string, string] = health.isSuccess
    ? ['var(--sage)', 'API conectada']
    : health.isError
    ? ['var(--fault)', 'API sin conexión']
    : ['var(--ember)', 'Conectando...'];

  if (cargando) return null;
  if (!usuario) return <Navigate to="/login" replace />;

  const esPaciente = usuario.rol === 'paciente';
  const segmentos = location.pathname.split('/').filter(Boolean);
  const seccion = esPaciente ? 'mi-panel' : segmentos[0] ?? 'dashboard';
  const nav = esPaciente ? NAV_PACIENTE : NAV_STAFF;

  const cerrarSesion = onCerrarSesion;

  return (
    <div className="app">
      <nav className="side" aria-label="Principal">
        <div className="brand"><i />KinesIA</div>
        {nav.map(([k, i, l]) => (
          <button key={k} className={'nav' + (seccion === k ? ' on' : '')} aria-current={seccion === k ? 'page' : undefined} onClick={() => { navigate('/' + k); scrollTo(0, 0); }}>
            <Ico k={i} />{l}
          </button>
        ))}
        <div className="foot"><i style={{ '--c': estado[0] } as CSSProperties} />{estado[1]} · {usuario.nombre}</div>
        <button className="btn" onClick={() => setCuenta(true)}>Perfil</button>
      </nav>
      <main>
        <Outlet />
      </main>
      {aviso && <div className="toast" role="status" aria-live="polite">{aviso}</div>}
      {cuenta && <MiCuenta toast={toast} onClose={() => setCuenta(false)} onLogout={cerrarSesion} />}
    </div>
  );
}

export default function App() {
  const [aviso, setAviso] = useState('');
  const [cuenta, setCuenta] = useState(false);
  const { logout } = useAuth();
  const cerrarSesion = useCallback(() => { setCuenta(false); logout(); }, [logout]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<AuthedLayout toast={(m: string) => setAviso(m)} aviso={aviso} onCerrarSesion={cerrarSesion} cuenta={cuenta} setCuenta={setCuenta} />}>
          <Route path="/" element={<VistaActual toast={(m: string) => setAviso(m)} />} />
          <Route path="/dashboard" element={<VistaActual toast={(m: string) => setAviso(m)} />} />
          <Route path="/pacientes" element={<VistaActual toast={(m: string) => setAviso(m)} />} />
          <Route path="/pacientes/:id" element={<VistaActual toast={(m: string) => setAviso(m)} />} />
          <Route path="/rutinas" element={<VistaActual toast={(m: string) => setAviso(m)} />} />
          <Route path="/mi-panel" element={<VistaActual toast={(m: string) => setAviso(m)} />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
