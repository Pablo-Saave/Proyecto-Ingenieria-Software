// src/services/avisosService.js
const API_BASE = 'http://localhost:3000';

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
  return data;
}

// Trabajador y Supervisor: solo avisos de su cuadrilla
export async function getAvisosMiUnidad() {
  const res = await apiFetch('/api/avisos/mi-unidad');
  return { unidad: res.unidad ?? null, avisos: Array.isArray(res.data) ? res.data : [] };
}

// Admin: todos los avisos de todas las cuadrillas
export async function getTodosLosAvisos() {
  const res = await apiFetch('/api/avisos/todas');
  return Array.isArray(res.data) ? res.data : [];
}

// Admin: lista de cuadrillas para el selector al publicar
export async function getCuadrillasAviso() {
  const res = await apiFetch('/api/avisos/cuadrillas');
  return Array.isArray(res.data) ? res.data : [];
}

// Supervisor y Admin: crear aviso
export async function crearAviso(data) {
  const res = await apiFetch('/api/avisos', { method: 'POST', body: JSON.stringify(data) });
  return res.data;
}

// Solo Admin: eliminar aviso
export async function eliminarAviso(id) {
  await apiFetch(`/api/avisos/${id}`, { method: 'DELETE' });
  return true;
}
