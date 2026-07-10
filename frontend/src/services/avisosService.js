const API_BASE = "http://146.83.198.35:1323/";

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

// Solo Supervisor: avisos de una cuadrilla puntual del proyecto que supervisa
export const getAvisosDeCuadrilla = async (id_cuadrilla, { page, limit } = {}) => {
  const params = new URLSearchParams();
  if (page)  params.set("page", page);
  if (limit) params.set("limit", limit);
  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await apiFetch(`/api/avisos/cuadrilla/${id_cuadrilla}${qs}`);
  return { avisos: res.data ?? [], meta: res.meta ?? {} };
};

// Solo Supervisor: proyecto(s) que supervisa junto a las cuadrillas de cada uno
// (reutiliza el endpoint existente de cuadrillas, evitando depender de una
// única cuadrilla fija asignada al supervisor)
export const getMisCuadrillasSupervisor = async () => {
  const res = await apiFetch("/api/cuadrilla/supervisor/misCuadrillasAndIntegrantes");
  return res.data ?? [];
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