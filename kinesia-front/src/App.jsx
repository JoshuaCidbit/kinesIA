import { useEffect, useState } from 'react';
import { Ico } from './components/ui';
import { useHealth } from './lib/queries';
import { useAuth } from './contexts/AuthContext';
import Dashboard from './pages/Dashboard';
import Pacientes from './pages/Pacientes';
import Perfil from './pages/Perfil';
import Rutinas from './pages/Rutinas';
import Login from './pages/Login';
import MiPanel from './pages/MiPanel';
import MiCuenta from './components/MiCuenta';   // NUEVO

// Función go derivada del rol (exportada para uso en páginas)
export const go = (x) => { location.hash = x; scrollTo(0, 0); };

const NAV_STAFF = [
  ['dashboard', 'd', 'Resumen'],
  ['pacientes', 'u', 'Pacientes'],
  ['rutinas', 'r', 'Rutinas'],
];
const NAV_PACIENTE = [['mi-panel', 'u', 'Mi panel']];
const VISTAS_STAFF = ['dashboard', 'pacientes', 'rutinas'];
const leerHash = () => location.hash.slice(1);

export default function App() {
  const { usuario, cargando, logout } = useAuth();
  const [hash, setHash] = useState(leerHash);
  const [aviso, setAviso] = useState('');
  const [cuenta, setCuenta] = useState(false);
  const cerrarSesion = () => {
    setCuenta(false);   // cierra el modal antes de salir
    logout();           // tu función actual de cerrar sesión;
  };
  const health = useHealth();

  useEffect(() => {
    const f = () => setHash(leerHash());
    addEventListener('hashchange', f);
    return () => removeEventListener('hashchange', f);
  }, []);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(''), 4000);
    return () => clearTimeout(t);
  }, [aviso]);

  if (cargando) return null;
  if (!usuario) return <Login />

  const esPaciente = usuario.rol === 'paciente';
let vista = esPaciente ? 'mi-panel' : hash;
  if (!esPaciente && !VISTAS_STAFF.includes(vista) && !vista.startsWith('paciente-')) vista = 'dashboard';
  const seccion = vista.startsWith('paciente-') ? 'pacientes' : vista;
  const nav = esPaciente ? NAV_PACIENTE : NAV_STAFF;

  const estado = health.isSuccess
    ? ['var(--sage)', 'API conectada']
    : health.isError
    ? ['var(--err)', 'API sin conexión']
    : ['var(--ochre)', 'Conectando...'];

  return (
    <div className="app">
      <nav className="side" aria-label="Principal">
        <div className="brand"><i />KinesIA</div>
        {nav.map(([k, i, l]) => (
          <button key={k} className={'nav' + (seccion === k ? ' on' : '')} aria-current={seccion === k ? 'page' : undefined} onClick={() => go(k)}>
            <Ico k={i} />{l}
          </button>
        ))}
        <div className="foot"><i style={{ '--c': estado[0] }} />{estado[1]} · {usuario.nombre}</div>
        <button className="btn" onClick={() => setCuenta(true)}>Perfil</button>
      </nav>
      <main>
        {vista === 'mi-panel' && <MiPanel toast={setAviso} />}
        {vista === 'dashboard' && <Dashboard go={go} />}
        {vista === 'pacientes' && <Pacientes go={go} toast={setAviso} />}
        {vista.startsWith('paciente-') && <Perfil id={Number(vista.split('-')[1])} go={go} toast={setAviso} />}
        {vista === 'rutinas' && <Rutinas toast={setAviso} />}
      </main>
      {aviso && <div className="toast" role="status">{aviso}</div>}
      {cuenta && <MiCuenta toast={setAviso} onClose={() => setCuenta(false)} onLogout={cerrarSesion} />}
    </div>
  );
}