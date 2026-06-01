const API_BASE = 'http://localhost:3000';

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || `Error ${res.status}`);
  }
  return res.json();
}

// Obtener todas las ausencias
export const getAusencias = () =>
  apiFetch('/api/ausencias');

// Crear ausencia
export const crearAusencia = (datos) =>
  apiFetch('/api/ausencias', {
    method: 'POST',
    body: JSON.stringify(datos),
  });

// Revisar ausencia (aprobar / rechazar)
export const revisarAusencia = (id, datos) =>
  apiFetch(`/api/ausencias/${id}/revisar`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  });

// Eliminar ausencia
export const eliminarAusencia = (id) =>
  apiFetch(`/api/ausencias/${id}`, { method: 'DELETE' });