// src/services/notificacionService.js
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

export const getNotificaciones = (page = 1, limit = 20) =>
  apiFetch(`/api/notificaciones?page=${page}&limit=${limit}`);

export const getContadorNoLeidas = async () => {
  const res = await apiFetch("/api/notificaciones/no-leidas/count");
  return res.count ?? 0;
};

export const marcarNotificacionLeida = (id_notificacion) =>
  apiFetch(`/api/notificaciones/${id_notificacion}/leer`, { method: "PATCH" });

export const marcarTodasLeidas = () =>
  apiFetch("/api/notificaciones/leer-todas", { method: "PATCH" });