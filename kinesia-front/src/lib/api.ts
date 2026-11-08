// Cliente HTTP para la API de KinesIA (App Service) y Azure Functions.
import type { Alimento, AgResultado, Estadisticas, Rutina, Sesion, Usuario } from './types';

const clean = (u?: string) => (u || '').replace(/\/$/, '');
// El front solo habla con la API. Las estadísticas pasan por un proxy en Express
// que llama a la Azure Function (ver SETUP.md).
const API = clean(import.meta.env.VITE_API_URL);

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

const MENSAJES: Record<number, string> = {
  400: 'Revisa los datos enviados.',
  404: 'No se encontró el registro.',
  409: 'No se puede completar: hay datos asociados o el valor ya existe.',
  500: 'Error del servidor. Intenta de nuevo.',
};

export interface RequestOptions {
  method?: string;
  body?: unknown;
  form?: FormData;
  headers?: Record<string, string>;
}

async function request<T>(base: string, path: string, { method = 'GET', body, form, headers }: RequestOptions = {}): Promise<T> {
  const hdrs: Record<string, string> = { Accept: 'application/json', ...(headers ?? {}) };
  if (!hdrs.Authorization && path !== '/api/usuarios/login') {
    const token = typeof window !== 'undefined' ? localStorage.getItem('kinesia_token') : null;
    if (token) hdrs.Authorization = `Bearer ${token}`;
  }
  const opts: RequestInit = { method, headers: hdrs };
  if (form) {
    opts.body = form; // FormData: el navegador pone el Content-Type con boundary; NO agregues Content-Type manualmente
  } else if (body !== undefined) {
    hdrs['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }

  let res: Response;
  try {
    res = await fetch(`${base}${path}`, opts);
  } catch {
    throw new ApiError(0, 'No hay conexión con el servidor (revisa red o CORS).');
  }

  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    const d = data as { error?: string; message?: string } | null;
    const msg = (d && (d.error || d.message)) || MENSAJES[res.status] || `Error ${res.status}`;
    // Si es 401 y no es la ruta de login, lanzar evento de sesión expirada
    if (res.status === 401 && path !== '/api/usuarios/login') {
      try { window.dispatchEvent(new Event('kinesia:unauthorized')); } catch { /* noop */ }
    }
    throw new ApiError(res.status, msg, d);
  }
  return data as T;
}

export const api = <T = unknown>(path: string, o?: RequestOptions) => request<T>(API, path, o);

const fd = (campo: string, archivo: File) => {
  const f = new FormData();
  f.append(campo, archivo);
  return f;
};

export const usuarios = {
  listar: () => api<Usuario[]>('/api/usuarios'),
  obtener: (id: number) => api<Usuario>(`/api/usuarios/${id}`),
  crear: (data: unknown) => api<Usuario>('/api/usuarios', { method: 'POST', body: data }),
  actualizar: (id: number, data: unknown) => api<Usuario>(`/api/usuarios/${id}`, { method: 'PUT', body: data }),
  eliminar: (id: number) => api<unknown>(`/api/usuarios/${id}`, { method: 'DELETE' }),
  coaches: () => api<Usuario[]>('/api/usuarios/coaches'),
  // El nombre del campo ("foto") debe coincidir con upload.single("...") en multer
  subirFoto: (id: number, archivo: File) => api(`/api/usuarios/${id}/foto`, { method: 'POST', form: fd('foto', archivo) }),
};

export const rutinas = {
  listar: () => api<Rutina[]>('/api/rutinas'),
  obtener: (id: number) => api<Rutina>(`/api/rutinas/${id}`),
  crear: (data: unknown) => api<Rutina>('/api/rutinas', { method: 'POST', body: data }),
  actualizar: (id: number, data: unknown) => api<Rutina>(`/api/rutinas/${id}`, { method: 'PUT', body: data }),
  eliminar: (id: number) => api<unknown>(`/api/rutinas/${id}`, { method: 'DELETE' }), // 409 si tiene sesiones
  subirMedia: (id: number, archivo: File) => api(`/api/rutinas/${id}/media`, { method: 'POST', form: fd('media', archivo) }),
};

export const sesiones = {
  listar: () => api<Sesion[]>('/api/sesiones'),
  obtener: (id: number) => api<Sesion>(`/api/sesiones/${id}`),
  porUsuario: (usuarioId: number) => api<Sesion[]>(`/api/sesiones/usuario/${usuarioId}`),
  // data: { usuarioId, rutinaId, fecha, repeticiones, precisionPromedio, observaciones }
  // Las respuestas traen además los objetos anidados `Usuario` y `Rutina` (con mayúscula).
  crear: (data: unknown) => api<Sesion>('/api/sesiones', { method: 'POST', body: data }),
  actualizar: (id: number, data: unknown) => api<Sesion>(`/api/sesiones/${id}`, { method: 'PUT', body: data }),
  eliminar: (id: number) => api<unknown>(`/api/sesiones/${id}`, { method: 'DELETE' }),
};

export const sistema = {
  health: () => api<{ status: string; db: string; timestamp: string }>('/api/health'),
  // Responde: { usuarioId, totalSesiones, promedioPrecision, ultimaSesion, rutinaMasUsada: {id, nombre, usos} }
  estadisticas: (usuarioId: number) => api<Estadisticas>(`/api/estadisticas/${usuarioId}`),
};

// Catálogo de alimentos (PostgreSQL). Filtros opcionales: { q, categoria }
export const alimentos = {
  listar: (filtros?: { q?: string; categoria?: string }) => {
    const params = new URLSearchParams();
    if (filtros?.q) params.set('q', filtros.q);
    if (filtros?.categoria) params.set('categoria', filtros.categoria);
    const qs = params.toString();
    return api<Alimento[]>(`/api/alimentos${qs ? `?${qs}` : ''}`);
  },
};

// Algoritmo genético calórico
export const ag = {
  // data: { usuarioId, peso, altura?, objetivo: 'cut'|'bulk', alimentoIds, opciones? }
  generar: (data: unknown) => api<AgResultado>('/api/ag/calorico', { method: 'POST', body: data }),
  // Historial resumido del paciente
  porUsuario: (usuarioId: number) => api<AgResultado[]>(`/api/ag/usuario/${usuarioId}`),
  // Detalle completo de un resultado
  resultado: (id: number) => api<AgResultado>(`/api/ag/resultados/${id}`),
};
