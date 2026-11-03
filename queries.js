// Hooks de TanStack Query v5 sobre el cliente de api.js
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usuarios, rutinas, sesiones, sistema } from "./api";

export const keys = {
  usuarios: ["usuarios"],
  usuario: (id) => ["usuarios", id],
  rutinas: ["rutinas"],
  rutina: (id) => ["rutinas", id],
  sesiones: ["sesiones"],
  sesionesUsuario: (id) => ["sesiones", "usuario", id],
  stats: (id) => ["estadisticas", id],
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
    onSuccess: (_r, { id }) => {
      qc.invalidateQueries({ queryKey: keys.usuarios });
      qc.invalidateQueries({ queryKey: keys.usuario(id) });
    },
  });
}

export function useEliminarUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usuarios.eliminar,
    // CASCADE: también se borran sus sesiones
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.usuarios });
      qc.invalidateQueries({ queryKey: keys.sesiones });
    },
  });
}

export function useSubirFotoUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, archivo }) => usuarios.subirFoto(id, archivo),
    onSuccess: (_r, { id }) => {
      qc.invalidateQueries({ queryKey: keys.usuarios });
      qc.invalidateQueries({ queryKey: keys.usuario(id) });
    },
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

export function useEliminarRutina() {
  const qc = useQueryClient();
  // Si responde 409, error.status === 409: muestra "tiene sesiones asociadas"
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

export function useCrearSesion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: sesiones.crear,
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: keys.sesiones });
      if (vars?.usuarioId) {
        qc.invalidateQueries({ queryKey: keys.sesionesUsuario(String(vars.usuarioId)) });
        qc.invalidateQueries({ queryKey: keys.stats(String(vars.usuarioId)) });
      }
    },
  });
}

export function useEliminarSesion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: sesiones.eliminar,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.sesiones });
      qc.invalidateQueries({ queryKey: ["estadisticas"] });
    },
  });
}

// ---------- Sistema / analítica (Azure Functions) ----------
export const useEstadisticas = (usuarioId) =>
  useQuery({ queryKey: keys.stats(usuarioId), queryFn: () => sistema.estadisticas(usuarioId), enabled: !!usuarioId });

export const useHealth = () =>
  useQuery({ queryKey: ["health"], queryFn: sistema.health, refetchInterval: 60_000, retry: false });
