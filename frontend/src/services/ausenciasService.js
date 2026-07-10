const API_BASE = import.meta.env.VITE_API_URL ?? 'http://146.83.198.35:1323/';

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token');

  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.body instanceof FormData
      ? {}
      : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || `Error ${res.status}`);
  }

  return res.json();
}

// Obtener todas las ausencias visibles para el usuario autenticado
export const getAusencias = () =>
  apiFetch('/api/ausencias');

// Ver las ausencias de un trabajador especifico
export const getAusenciasPorTrabajador = (id) =>
  apiFetch(`/api/ausencias/trabajador/${id}`);

// Crear ausencia (Flujo normal del trabajador)
export const crearAusencia = (datos) =>
  apiFetch('/api/ausencias', {
    method: 'POST',
    body: JSON.stringify(datos),
  });

// Crear inasistencia por Supervisor
export const crearAusenciaPorSupervisor = (datos) =>
  apiFetch('/api/ausencias/supervisor', {
    method: 'POST',
    body: JSON.stringify(datos),
  });

// Justificar una inasistencia por trabajadorr
export const justificarAusencia = (id, datos) =>
  apiFetch(`/api/ausencias/${id}/justificar`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  });

// Revisar ausencia (Aprobar / Rechazar)
export const revisarAusencia = (id, datos) =>
  apiFetch(`/api/ausencias/${id}/revisar`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  });

// Eliminar ausencia
export const eliminarAusencia = (id) =>
  apiFetch(`/api/ausencias/${id}`, { method: 'DELETE' });

// Cuadrillas del supervisor junto con sus integrantes
export const getMisCuadrillas = () =>
  apiFetch('/api/cuadrilla/supervisor/misCuadrillasAndIntegrantes');

export const getFileUrl = (path) => {
  if (!path) return '';
  return `${API_BASE}${path}`;
};

// subirPDF
export const subirPDFAusencia = (idAusencia, archivo) => {
  if (!archivo) return;

  const formData = new FormData();
  formData.append('archivo', archivo);

  return apiFetch(`/api/ausencias/${idAusencia}/documento`, {
    method: 'POST',
    body: formData,
  });
};