import { useEffect, useState } from 'react';
import { Ico } from './components/ui';
import { useHealth } from './lib/queries';
import Dashboard from './pages/Dashboard';
import Pacientes from './pages/Pacientes';
import Perfil from './pages/Perfil';
import Rutinas from './pages/Rutinas';

const NAV = [
  ['dashboard', 'd', 'Resumen'],
  ['pacientes', 'u', 'Pacientes'],
  ['rutinas', 'r', 'Rutinas'],
];
const leerHash = () => location.hash.slice(1) || 'dashboard';

export default function App() {
  const [vista, setVista] = useState(leerHash);
  const [aviso, setAviso] = useState('');
  const health = useHealth();

  useEffect(() => {
    const h = () => setVista(leerHash());
    addEventListener('hashchange', h);
    return () => removeEventListener('hashchange', h);
  }, []);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(''), 4000);
    return () => clearTimeout(t);
  }, [aviso]);

  const go = (x) => { location.hash = x; scrollTo(0, 0); };
  const seccion = vista.startsWith('paciente-') ? 'pacientes' : vista;
  const estado = health.isSuccess
    ? ['var(--sage)', 'API conectada']
    : health.isError
    ? ['var(--err)', 'API sin conexión']
    : ['var(--ochre)', 'Conectando...'];

  return (
    <div className="app">
      <nav className="side" aria-label="Principal">
        <div className="brand"><i />KinesIA</div>
        {NAV.map(([k, i, l]) => (
          <button key={k} className={'nav' + (seccion === k ? ' on' : '')} aria-current={seccion === k ? 'page' : undefined} onClick={() => go(k)}>
            <Ico k={i} />{l}
          </button>
        ))}
        <div className="foot"><i style={{ '--c': estado[0] }} />{estado[1]}</div>
      </nav>
      <main>
        {vista === 'dashboard' && <Dashboard go={go} />}
        {vista === 'pacientes' && <Pacientes go={go} toast={setAviso} />}
        {vista.startsWith('paciente-') && <Perfil id={Number(vista.split('-')[1])} go={go} toast={setAviso} />}
        {vista === 'rutinas' && <Rutinas toast={setAviso} />}
      </main>
      {aviso && <div className="toast" role="status">{aviso}</div>}
    </div>
  );
}
