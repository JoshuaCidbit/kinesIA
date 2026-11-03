import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rutinas, sesiones, sistema, usuarios } from './api';

// Todos los ids se convierten a String para que 1 y "1" sean la misma key
export const keys = {
  usuarios: ['usuarios'],
  usuario: (id) => ['usuarios', String(id)],
  rutinas: ['rutinas'],
  sesiones: ['sesiones'],
  sesionesUsuario: (id) => ['sesiones', 'usuario', String(id)],
  stats: (id) => ['estadisticas', String(id)],
};

// ---------- Pacientes ----------
export const useUsuarios = () => useQuery({ queryKey: keys.usuarios, queryFn: usuarios.listar });
export const useUsuario = (id) =>
  useQuery({ queryKey: keys.usuario(id), queryFn: () => usuarios.obtener(id), enabled: !!id });

export function useCrearUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usuarios.crear,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.usuarios }),
  });
}

export function useActualizarUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => usuarios.actualizar(id, data),
    // invalidar ['usuarios'] ya cubre ['usuarios', id] (match por prefijo)
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.usuarios }),
  });
}

export function useEliminarUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usuarios.eliminar,
    // CASCADE: también se borran sus sesiones y cambian sus estadísticas
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.usuarios });
      qc.invalidateQueries({ queryKey: keys.sesiones });
      qc.invalidateQueries({ queryKey: ['estadisticas'] });
    },
  });
}

export function useSubirFotoUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, archivo }) => usuarios.subirFoto(id, archivo),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.usuarios }),
  });
}

// ---------- Rutinas ----------
export const useRutinas = () => useQuery({ queryKey: keys.rutinas, queryFn: rutinas.listar });

export function useCrearRutina() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: rutinas.crear,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.rutinas }),
  });
}

export function useActualizarRutina() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => rutinas.actualizar(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.rutinas }),
  });
}

export function useEliminarRutina() {
  const qc = useQueryClient();
  // error.status === 409 → "tiene sesiones asociadas"
  return useMutation({
    mutationFn: rutinas.eliminar,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.rutinas }),
  });
}

export function useSubirMediaRutina() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, archivo }) => rutinas.subirMedia(id, archivo),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.rutinas }),
  });
}

// ---------- Sesiones ----------
export const useSesiones = () => useQuery({ queryKey: keys.sesiones, queryFn: sesiones.listar });
export const useSesionesUsuario = (id) =>
  useQuery({ queryKey: keys.sesionesUsuario(id), queryFn: () => sesiones.porUsuario(id), enabled: !!id });

// Al crear/editar/eliminar una sesión cambian listas y estadísticas
function invalidarSesiones(qc) {
  qc.invalidateQueries({ queryKey: keys.sesiones }); // incluye ['sesiones','usuario',id]
  qc.invalidateQueries({ queryKey: ['estadisticas'] });
}

export function useCrearSesion() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: sesiones.crear, onSuccess: () => invalidarSesiones(qc) });
}

export function useActualizarSesion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => sesiones.actualizar(id, data),
    onSuccess: () => invalidarSesiones(qc),
  });
}

export function useEliminarSesion() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: sesiones.eliminar, onSuccess: () => invalidarSesiones(qc) });
}

// ---------- Sistema / analítica ----------
export const useEstadisticas = (usuarioId) =>
  useQuery({
    queryKey: keys.stats(usuarioId),
    queryFn: () => sistema.estadisticas(usuarioId),
    enabled: !!usuarioId,
  });

export const useHealth = () =>
  useQuery({ queryKey: ['health'], queryFn: sistema.health, refetchInterval: 60_000, retry: false });