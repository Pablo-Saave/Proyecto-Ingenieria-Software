const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

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

// Obtener todas las ausencias visibles para el usuario autenticado
// (administrador: todas · supervisor: las de sus proyectos · trabajador: las suyas)
export const getAusencias = () =>
  apiFetch('/api/ausencias');

// Ver las ausencias de un trabajador específico (usado en "Mis Ausencias")
export const getAusenciasPorTrabajador = (id) =>
  apiFetch(`/api/ausencias/trabajador/${id}`);

// Crear ausencia (Flujo normal del trabajador desde su panel — anticipada)
export const crearAusencia = (datos) =>
  apiFetch('/api/ausencias', {
    method: 'POST',
    body: JSON.stringify(datos),
  });

// Crear inasistencia por Supervisor (Inasistencia espontánea detectada en terreno)
export const crearAusenciaPorSupervisor = (datos) =>
  apiFetch('/api/ausencias/supervisor', {
    method: 'POST',
    body: JSON.stringify(datos),
  });

// Justificar una inasistencia (El trabajador sube el motivo/documento)
// Sincronizado con router.put('/:id/justificar', ...) en ausencia.routes.js
export const justificarAusencia = (id, datos) =>
  apiFetch(`/api/ausencias/${id}/justificar`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  });

// Revisar ausencia (Aprobar / Rechazar por el Supervisor)
// Sincronizado con router.put('/:id/revisar', ...) en ausencia.routes.js
export const revisarAusencia = (id, datos) =>
  apiFetch(`/api/ausencias/${id}/revisar`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  });

// Eliminar ausencia
export const eliminarAusencia = (id) =>
  apiFetch(`/api/ausencias/${id}`, { method: 'DELETE' });