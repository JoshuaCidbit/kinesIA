import { useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Modal } from './ui';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { api, usuarios } from '../lib/api';

interface MiCuentaProps {
  onClose: () => void;
  onLogout: () => void;
  toast?: (msg: string) => void;
}

export default function MiCuenta({ onClose, onLogout, toast }: MiCuentaProps) {
  const { usuario } = useAuth();
  const { tema, toggleTema } = useTheme();
  const [cambiando, setCambiando] = useState(false);
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [guardando, setGuardando] = useState(false);
  const inputFoto = useRef<HTMLInputElement>(null);
  const uid = useId();

  if (!usuario) return null;

  const subirFoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      await usuarios.subirFoto(usuario.id, f);
      toast?.('Foto actualizada');
    } catch (err) {
      toast?.(err instanceof Error ? err.message : 'No se pudo subir la foto');
    }
    e.target.value = '';
  };

  const cancelar = () => {
    setCambiando(false);
    setActual(''); setNueva(''); setConfirmar('');
  };

  const cambiar = async (e: FormEvent) => {
    e.preventDefault();
    if (nueva.length < 8) return toast?.('La nueva contraseña debe tener al menos 8 caracteres');
    if (nueva !== confirmar) return toast?.('Las contraseñas no coinciden');
    setGuardando(true);
    try {
      await api('/api/usuarios/me/password', { method: 'PUT', body: { actual, nueva } });
      toast?.('Contraseña actualizada');
      cancelar();
    } catch (err) {
      toast?.(err instanceof Error ? err.message : 'No se pudo actualizar la contraseña');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal titulo="Mi perfil" onClose={onClose} className="form-modal">
      <p><b>{usuario.nombre}</b> · <span className="muted">{usuario.rol}</span></p>
      <p className="muted">{usuario.email}</p>

      {!cambiando ? (
        <div className="actions">
          <input ref={inputFoto} id={`${uid}-foto`} type="file" accept="image/*" hidden onChange={subirFoto} />
          <button type="button" className="btn" onClick={() => inputFoto.current?.click()}>Cambiar foto</button>
          <button type="button" className="btn" onClick={() => setCambiando(true)}>Cambiar contraseña</button>
          <button type="button" className="btn dng" onClick={onLogout}>Cerrar sesión</button>
        </div>
      ) : (
        <form onSubmit={cambiar}>
          <h3>Cambiar contraseña</h3>
          <div className="form-group">
            <label htmlFor={`${uid}-actual`}>Contraseña actual</label>
            <input id={`${uid}-actual`} className="input" type="password" required value={actual} onChange={(e) => setActual(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor={`${uid}-nueva`}>Nueva contraseña</label>
            <input id={`${uid}-nueva`} className="input" type="password" required minLength={8} value={nueva} onChange={(e) => setNueva(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor={`${uid}-confirmar`}>Confirmar nueva contraseña</label>
            <input id={`${uid}-confirmar`} className="input" type="password" required minLength={8} value={confirmar} onChange={(e) => setConfirmar(e.target.value)} />
          </div>
          <div className="actions">
            <button type="button" className="btn" onClick={cancelar}>Cancelar</button>
            <button type="submit" className="btn pri" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar contraseña'}</button>
          </div>
        </form>
      )}

      <div className="tema">
        <span className="muted">Tema</span>
        <button type="button" className="btn" onClick={toggleTema} aria-pressed={tema === 'dark'}>
          {tema === 'dark' ? 'Claro' : 'Obscuro'}
        </button>
      </div>
    </Modal>
  );
}
