// Cliente HTTP para la API de KinesIA (App Service) y Azure Functions.
const clean = (u) => (u || "").replace(/\/$/, "");
// El front solo habla con la API. Las estadísticas pasan por un proxy en Express
// que llama a la Azure Function (ver SETUP.md).
const API = clean(import.meta.env.VITE_API_URL);

export class ApiError extends Error {
  constructor(status, message, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

const MENSAJES = {
  400: "Revisa los datos enviados.",
  404: "No se encontró el registro.",
  409: "No se puede completar: hay datos asociados o el valor ya existe.",
  500: "Error del servidor. Intenta de nuevo.",
};

async function request(base, path, { method = "GET", body, form, headers = {} } = {}) {
  const opts = { method, headers: { Accept: "application/json", ...headers } };
  if (form) {
    opts.body = form; // FormData: el navegador pone el Content-Type con boundary
  } else if (body !== undefined) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`${base}${path}`, opts);
  } catch {
    throw new ApiError(0, "No hay conexión con el servidor (revisa red o CORS).");
  }

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || MENSAJES[res.status] || `Error ${res.status}`;
    throw new ApiError(res.status, msg, data);
  }
  return data;
}

const api = (path, o) => request(API, path, o);

const fd = (campo, archivo) => {
  const f = new FormData();
  f.append(campo, archivo);
  return f;
};

export const usuarios = {
  listar: () => api("/api/usuarios"),
  obtener: (id) => api(`/api/usuarios/${id}`),
  crear: (data) => api("/api/usuarios", { method: "POST", body: data }),
  actualizar: (id, data) => api(`/api/usuarios/${id}`, { method: "PUT", body: data }),
  eliminar: (id) => api(`/api/usuarios/${id}`, { method: "DELETE" }),
  // El nombre del campo ("foto") debe coincidir con upload.single("...") en multer
  subirFoto: (id, archivo) => api(`/api/usuarios/${id}/foto`, { method: "POST", form: fd("foto", archivo) }),
};

export const rutinas = {
  listar: () => api("/api/rutinas"),
  obtener: (id) => api(`/api/rutinas/${id}`),
  crear: (data) => api("/api/rutinas", { method: "POST", body: data }),
  actualizar: (id, data) => api(`/api/rutinas/${id}`, { method: "PUT", body: data }),
  eliminar: (id) => api(`/api/rutinas/${id}`, { method: "DELETE" }), // 409 si tiene sesiones
  subirMedia: (id, archivo) => api(`/api/rutinas/${id}/media`, { method: "POST", form: fd("media", archivo) }),
};

export const sesiones = {
  listar: () => api("/api/sesiones"),
  obtener: (id) => api(`/api/sesiones/${id}`),
  porUsuario: (usuarioId) => api(`/api/sesiones/usuario/${usuarioId}`),
  // data: { usuarioId, rutinaId, fecha, repeticiones, precisionPromedio, observaciones }
  // Las respuestas traen además los objetos anidados `Usuario` y `Rutina` (con mayúscula).
  crear: (data) => api("/api/sesiones", { method: "POST", body: data }),
  actualizar: (id, data) => api(`/api/sesiones/${id}`, { method: "PUT", body: data }),
  eliminar: (id) => api(`/api/sesiones/${id}`, { method: "DELETE" }),
};

export const sistema = {
  health: () => api("/api/health"),
  // Responde: { usuarioId, totalSesiones, promedioPrecision, ultimaSesion, rutinaMasUsada: {id, nombre, usos} }
  estadisticas: (usuarioId) => api(`/api/estadisticas/${usuarioId}`),
};
