import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Avatar, Mensaje, Rol } from '../components/ui';
import FormUsuario from '../components/FormUsuario';
import { api } from '../lib/api';

export default function Pacientes({ go, toast }) {
  const { usuario } = useAuth();
  const [creando, setCreando] = useState(false);
  const [lista, setLista] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [error, setError] = useState(null);
  const esAdmin = usuario?.rol === 'admin';

  const recargar = useCallback(async () => {
    try {
      const r = await api('/api/usuarios');
      setLista(Array.isArray(r) ? r : []);
      setError(null);
    } catch (e) { setError(e.message || 'Error cargando usuarios'); }
  }, []);

  useEffect(() => {
    recargar();
    if (esAdmin) {
      api('/api/usuarios/coaches')
        .then((r) => setCoaches(Array.isArray(r) ? r : []))
        .catch(() => setCoaches([]));
    }
  }, [recargar, esAdmin]);

  const asignar = async (id, coachId) => {
    try {
      await api(`/api/usuarios/${id}/coach`, {
        method: 'PUT',
        body: { coachId: coachId === '' ? null : Number(coachId) },
      });
      toast?.('Coach actualizado');
      recargar();
    } catch (e) { toast?.(e.message || 'No se pudo asignar'); }
  };

  if (usuario?.rol === 'paciente') return null;

  const pacientes = lista.filter((u) => u.rol === 'paciente');

  return (
    <>
      <div className="topbar">
        <div>
          <h1>{esAdmin ? 'Usuarios' : 'Pacientes'}</h1>
          <p className="sub">
            {esAdmin ? 'Ves todos los usuarios y asignas coaches.' : 'Ves solo tus pacientes asignados.'}
          </p>
        </div>
        <div className="bar">
          <button className="btn pri" onClick={() => setCreando(true)}>
            {esAdmin ? 'Registrar nuevo usuario' : 'Registrar nuevo paciente'}
          </button>
        </div>
      </div>

      <div className="grid3">
        <div className="card kpi">
          <b>{pacientes.length}</b>
          <span>Total de pacientes</span>
        </div>
        {esAdmin && (
          <div className="card kpi quiet">
            <b>{lista.length - pacientes.length}</b>
            <span>Coaches y admins</span>
          </div>
        )}
      </div>

      {error && <Mensaje titulo="Error" texto={error} error />}
      {!error && lista.length === 0 && <Mensaje titulo="Sin usuarios" texto="Aún no hay registros." />}

      {lista.length > 0 && (
        <>
          <h2 className="seccion">{esAdmin ? 'Directorio' : 'Mis pacientes'}</h2>
          <div className="card scroll">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th><th>Email</th><th>Rol</th>
                  {esAdmin && <th>Coach</th>}
                </tr>
              </thead>
              <tbody>
                {lista.map((u) => (
                  <tr key={u.id}>
                    <td><Avatar usuario={u} /> {u.nombre}</td>
                    <td>{u.email}</td>
                    <td><Rol v={u.rol} /></td>
                    {esAdmin && (
                      <td className="coach-cell">
                        {u.rol === 'paciente' ? (
                          <select className="input" value={u.coachId ?? ''} onChange={(e) => asignar(u.id, e.target.value)}>
                            <option value="">Sin coach</option>
                            {coaches.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                          </select>
                        ) : '—'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {creando && (
        <FormUsuario
          esAdmin={esAdmin}
          toast={toast}
          onClose={() => setCreando(false)}
          onCreated={recargar}
        />
      )}
    </>
  );
}