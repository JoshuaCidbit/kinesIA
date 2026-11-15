import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ag, alimentos, rutinas, sesiones, sistema, usuarios } from './api';

// Todos los ids se convierten a String para que 1 y "1" sean la misma key
export const keys = {
  usuarios: ['usuarios'],
  usuario: (id: number) => ['usuarios', String(id)],
  rutinas: ['rutinas'],
  sesiones: ['sesiones'],
  sesionesUsuario: (id: number) => ['sesiones', 'usuario', String(id)],
  stats: (id: number) => ['estadisticas', String(id)],
  alimentos: ['alimentos'],
  agUsuario: (id: number) => ['ag', 'usuario', String(id)],
  agResultado: (id: number) => ['ag', 'resultado', String(id)],
};

// ---------- Pacientes ----------
export const useUsuarios = () => useQuery({ queryKey: keys.usuarios, queryFn: usuarios.listar });
export const useUsuario = (id?: number | null) =>
  useQuery({ queryKey: keys.usuario(id ?? 0), queryFn: () => usuarios.obtener(id as number), enabled: !!id });

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
    mutationFn: ({ id, data }: { id: number; data: unknown }) => usuarios.actualizar(id, data),
    // invalidar ['usuarios'] ya cubre ['usuarios', id] (match por prefijo)
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.usuarios }),
  });
}

export function useEliminarUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => usuarios.eliminar(id),
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
    mutationFn: ({ id, archivo }: { id: number; archivo: File }) => usuarios.subirFoto(id, archivo),
    onSuccess: (_dato, variables) => {
      qc.invalidateQueries({ queryKey: keys.usuarios });
      qc.invalidateQueries({ queryKey: keys.usuario(variables.id) });
    },
  });
}

export function useActualizarCoach() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, coachId }: { id: number; coachId: number | null }) =>
      usuarios.actualizarCoach(id, coachId),
    // invalidar ['usuarios'] cubre también ['usuarios', id]
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
    mutationFn: ({ id, data }: { id: number; data: unknown }) => rutinas.actualizar(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.rutinas }),
  });
}

export function useEliminarRutina() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => rutinas.eliminar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.rutinas }),
  });
}

export function useSubirMediaRutina() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, archivo }: { id: number; archivo: File }) => rutinas.subirMedia(id, archivo),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.rutinas }),
  });
}

// ---------- Sesiones ----------
export const useSesiones = (enabled = true) =>
  useQuery({ queryKey: keys.sesiones, queryFn: sesiones.listar, enabled });
export const useSesionesUsuario = (id?: number | null) =>
  useQuery({ queryKey: keys.sesionesUsuario(id ?? 0), queryFn: () => sesiones.porUsuario(id as number), enabled: !!id });

// Al crear/editar/eliminar una sesión cambian listas y estadísticas
function invalidarSesiones(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: keys.sesiones }); // incluye ['sesiones','usuario',id]
  qc.invalidateQueries({ queryKey: ['estadisticas'] });
}

export function useCrearSesion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: sesiones.crear,
    onSuccess: () => invalidarSesiones(qc),
  });
}

export function useActualizarSesion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: unknown }) => sesiones.actualizar(id, data),
    onSuccess: () => invalidarSesiones(qc),
  });
}

export function useEliminarSesion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => sesiones.eliminar(id),
    onSuccess: () => invalidarSesiones(qc),
  });
}

// ---------- Sistema / analítica ----------
export const useEstadisticas = (usuarioId?: number | null) =>
  useQuery({
    queryKey: keys.stats(usuarioId ?? 0),
    queryFn: () => sistema.estadisticas(usuarioId as number),
    enabled: !!usuarioId,
  });

export const useHealth = () =>
  useQuery({ queryKey: ['health'], queryFn: sistema.health, refetchInterval: 60_000, retry: false });

// ---------- Alimentos y plan calórico (AG) ----------
export const useAlimentos = () =>
  useQuery({
    queryKey: keys.alimentos,
    queryFn: () => alimentos.listar(),
    staleTime: 5 * 60_000, // el catálogo cambia poco
  });

export const useHistorialAG = (usuarioId?: number | null) =>
  useQuery({
    queryKey: keys.agUsuario(usuarioId ?? 0),
    queryFn: () => ag.porUsuario(usuarioId as number),
    enabled: !!usuarioId,
  });

export const useResultadoAG = (id?: number | null) =>
  useQuery({
    queryKey: keys.agResultado(id ?? 0),
    queryFn: () => ag.resultado(id as number),
    enabled: !!id,
  });

export function useGenerarPlanCalorico(usuarioId?: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ag.generar,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.agUsuario(usuarioId ?? 0) }),
  });
}

export function useCoaches(enabled = true) {
  return useQuery({ queryKey: ['coaches'], queryFn: usuarios.coaches, enabled });
}
