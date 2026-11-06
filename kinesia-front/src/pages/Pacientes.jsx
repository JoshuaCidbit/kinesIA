# Diagnóstico: Desde el panel admin solo se ven usuarios paciente
# 
# Causa raíz: En kinesia-api/src/controllers/usuario.controller.js línea 46,
# el método `listar` siempre tenía `const where = { rol: 'paciente' }`, ignorando
# el rol del usuario administrador. Los coaches y otros admins no aparecían en la lista.
# 
# Solución aplicada: Se modificó el filtro `where` para ser condicional:
# - Admin: sin filtro de rol, trae a todos los usuarios (pacientes + coaches + admins)
# - Coach: where.rol = 'paciente' + where.coachId = usuario.id (solo sus pacientes)
# - Paciente: acceso denegado (403)
# 
# Archivos clave: usuario.controller.js, rutas usuario.routes.js, Pacientes.jsx, Dashboard.jsx
# 
# Reporte completo: problemas.md y codigo.md en el directorio raíz
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import FormUsuario from '../components/FormUsuario';

export default function Pacientes({ go, toast }) {
  const { usuario } = useAuth();
  const [creando, setCreando] = useState(false);
  const esAdmin = usuario.rol === 'admin';

  // El paciente no tiene acceso a esta página
  if (usuario.rol === 'paciente') return null;

  return (
    <>
      <h1>Pacientes</h1>
      <p className="sub">
        {esAdmin
          ? 'Puedes ver todos los pacientes y asignar coaches.'
          : 'Ves solo tus pacientes asignados.'}
      </p>

      <div className="bar">
        {esAdmin ? (
          <button className="btn pri" onClick={() => setCreando(true)}>
            {creando ? 'Registrando...' : 'Registrar nuevo usuario'}
          </button>
        ) : (
          <button className="btn pri">Registrar nuevo paciente</button>
        )}
      </div>

      <div className="grid2">
        <div className="card kpi">
          <b>—</b>
          <span>Total de pacientes (pendiente de conectar)</span>
        </div>
        <div className="card">
          <h2>Tu acceso</h2>
          <span className={'badge ' + (esAdmin ? 'c-ochre' : 'c-sage')}>
            {esAdmin ? 'Modo admin' : 'Modo coach'}
          </span>
        </div>
      </div>

      {creando && <FormUsuario esAdmin={esAdmin} toast={toast} onClose={() => setCreando(false)} />}
    </>
  );
}
