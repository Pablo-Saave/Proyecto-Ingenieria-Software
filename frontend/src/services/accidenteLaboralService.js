// services/accidenteLaboralService.js

const API_BASE = 'http://146.83.198.35:1323/';

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
    throw new Error(err.message || `Error ${res.status}`);
  }

  return res.json();
}

/**
 * getMisAccidentesLaborales
 *
 * Obtiene la lista paginada de accidentes laborales del trabajador autenticado.
 * Endpoint: GET /api/accidente_laboral/trabajador/
 *
 * @param {number} page  - Página solicitada (default: 1)
 * @param {number} limit - Registros por página (default: 8)
 * @returns {Promise<{
 *   status: { total: number, page: number, limit: number, totalPages: number },
 *   data: Array<{
 *     id_accidente, id_trabajador, id_cuadrilla, nombre_cuadrilla,
 *     fecha_accidente, descripcion, gravedad, traslado, observaciones,
 *     proyecto: { id_proyecto, nombre_proyecto, id_supervisor, supervisor: { nombres, apellidos } },
 *     trabajador: { id_trabajador, rut, nombres, apellidos, sexo, telefono, correo, estado_laboral }
 *   }>
 * }>}
 */
export async function getMisAccidentesLaborales(page = 1, limit = 8) {
  const res = await apiFetch(`/api/accidente_laboral/trabajador/?page=${page}&limit=${limit}`);
  return res.data; // { status: { total, page, limit, totalPages }, data: [...] }
}