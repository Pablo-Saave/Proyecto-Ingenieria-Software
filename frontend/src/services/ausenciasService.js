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

// Obtener todas las ausencias (Filtra por cuadrilla automáticamente en el backend)
export const getAusencias = () =>
  apiFetch('/api/ausencias');

// Crear ausencia (Flujo normal del trabajador)
export const crearAusencia = (datos) =>
  apiFetch('/api/ausencias', {
    method: 'POST',
    body: JSON.stringify(datos),
  });

// Crear ausencia por Supervisor (Inasistencia espontánea)
export const crearAusenciaPorSupervisor = (datos) =>
  apiFetch('/api/ausencias/supervisor', { // Asegúrate de que tu router apunte a /supervisor
    method: 'POST',
    body: JSON.stringify(datos),
  });

// Justificar una inasistencia (El trabajador sube el motivo/documento)
export const justificarAusencia = (id, datos) =>
  apiFetch(`/api/ausencias/justificar/${id}`, { // Sincronizado con tu controlador
    method: 'POST',
    body: JSON.stringify(datos),
  });

// Revisar ausencia (Aprobar / Rechazar por el Supervisor)
export const revisarAusencia = (id, datos) =>
  apiFetch(`/api/ausencias/revisar/${id}`, { 
    method: 'PATCH', // Cambiado a PATCH porque altera un estado parcial y usa transacciones
    body: JSON.stringify(datos),
  });

// Eliminar ausencia
export const eliminarAusencia = (id) =>
  apiFetch(`/api/ausencias/${id}`, { method: 'DELETE' });