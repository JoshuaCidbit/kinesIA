import { useState } from 'react';
import { Modal } from './ui';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

export default function MiCuenta({ onClose, onLogout, toast }) {
  const { usuario } = useAuth();
  const [cambiando, setCambiando] = useState(false);
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cancelar = () => {
    setCambiando(false);
    setActual(''); setNueva(''); setConfirmar('');
  };

  const cambiar = async (e) => {
    e.preventDefault();
    if (nueva.length < 8) return toast?.('La nueva contraseña debe tener al menos 8 caracteres');
    if (nueva !== confirmar) return toast?.('Las contraseñas no coinciden');
    setGuardando(true);
    try {
      await api('/api/usuarios/me/password', { method: 'PUT', body: { actual, nueva } });
      toast?.('Contraseña actualizada');
      cancelar();
    } catch (err) { toast?.(err.message); }
    finally { setGuardando(false); }
  };

  return (
    <Modal titulo="Mi perfil" onClose={onClose} className="form-modal">
      <p><b>{usuario.nombre}</b> · <span className="muted">{usuario.rol}</span></p>
      <p className="muted">{usuario.email}</p>

      {!cambiando ? (
        <div className="actions">
          <button type="button" className="btn" onClick={() => setCambiando(true)}>Cambiar contraseña</button>
          <button type="button" className="btn dng" onClick={onLogout}>Cerrar sesión</button>
        </div>
      ) : (
        <form onSubmit={cambiar}>
          <h3>Cambiar contraseña</h3>
          <div className="form-group">
            <label>Contraseña actual</label>
            <input className="input" type="password" required value={actual} onChange={(e) => setActual(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Nueva contraseña</label>
            <input className="input" type="password" required minLength={8} value={nueva} onChange={(e) => setNueva(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Confirmar nueva contraseña</label>
            <input className="input" type="password" required minLength={8} value={confirmar} onChange={(e) => setConfirmar(e.target.value)} />
          </div>
          <div className="actions">
            <button type="button" className="btn" onClick={cancelar}>Cancelar</button>
            <button className="btn pri" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar contraseña'}</button>
          </div>
        </form>
      )}
    </Modal>
  );
}