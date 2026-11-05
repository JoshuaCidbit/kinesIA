import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import Dashboard from './Dashboard';
import Perfil from './Perfil';

const TOKEN_KEY = 'kinesia_token';

export default function MiPanel({ toast }) {
  const { usuario } = useAuth();
  const qc = useQueryClient();
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        // Obtener datos del usuario actual
        const userData = await api('/api/usuarios/me');
        // Cargar sesiones del paciente
        const sesiones = await api('/api/sesiones/usuario/' + usuario.id);
        setCargando(false);
      } catch (err) {
        console.error('Error cargando MiPanel:', err);
        setCargendo(false);
      }
    };

    cargarDatos();
  }, [usuario, qc]);

  if (cargando) return <div>Cargando...</div>;

  return (
    <div>
      <h2>Mi panel</h2>
      <div>
        <h3>Estadísticas propias</h3>
        {/* Reutilizamos componentes del Dashboard para el resumen */}
        <p>ID de usuario: {usuario.id}</p>
        <p>Rol: {usuario.rol}</p>
      </div>
      <div>
        <h3>Sesiones propias</h3>
        <p>Total de sesiones: pending</p>
      </div>
      <div>
        <h3>Plan calórico</h3>
        <button>Ver plan</button>
      </div>
      <div>
        <h3>Perfil</h3>
        <Perfil id={usuario.id} go={() => {}} toast={toast} />
      </div>
    </div>
  );
}