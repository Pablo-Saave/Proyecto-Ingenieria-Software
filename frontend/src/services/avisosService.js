// src/services/avisosService.js
const API_BASE = "http://localhost:3000";

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
  return data;
}

// Trabajador / Supervisor / Admin: avisos de la propia cuadrilla
export const getAvisosMiUnidad = async () => {
  const res = await apiFetch("/api/avisos/mi-unidad");
  return { unidad: res.unidad ?? null, avisos: res.data ?? [] };
};

// Solo Admin: todos los avisos de todas las cuadrillas
export const getTodosLosAvisos = async () => {
  const res = await apiFetch("/api/avisos/todas");
  return res.data ?? [];
};

// Solo Admin: lista de cuadrillas para el selector al publicar
export const getCuadrillasAviso = async () => {
  const res = await apiFetch("/api/avisos/cuadrillas");
  return res.data ?? [];
};

// Admin / Supervisor: crear aviso (id_cuadrilla obligatorio solo para Admin)
export const crearAviso = async (data) => {
  const res = await apiFetch("/api/avisos", { method: "POST", body: JSON.stringify(data) });
  return res.data;
};

// Admin / Supervisor (solo sus propios avisos): eliminar aviso
export const eliminarAviso = async (id) => {
  await apiFetch(`/api/avisos/${id}`, { method: "DELETE" });
};

// Autor del aviso: editar titulo, contenido y/o prioridad
export const editarAviso = async (id, data) => {
  const res = await apiFetch(`/api/avisos/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  return res.data;
};