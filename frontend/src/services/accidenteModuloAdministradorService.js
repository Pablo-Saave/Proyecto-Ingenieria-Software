// services/accidenteModuloAdministradorService.js

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
    throw new Error(err.message || `Error ${res.status}`);
  }

  return res.json();
}

/**
 * getProyectosParaFiltro
 * GET /api/proyectos/?limit=100
 *
 * Obtiene todos los proyectos del sistema para poblar el dropdown de filtro.
 * handleSuccess envuelve la respuesta, por lo que la forma real es:
 *   HTTP body → { data: { data: [...proyectos], meta: {...} } }
 *
 * @returns {Promise<Array<{ id_proyecto, nombre_proyecto, estado, ... }>>}
 */
export async function getProyectosParaFiltro() {
  const res = await apiFetch('/api/proyectos/?limit=100');
  // Doble anidado por handleSuccess: res.data = { data: [...], meta: {...} }
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

/**
 * getAllAccidentesAdmin
 * GET /api/accidente_laboral/admin/
 *
 * @param {number}        page        - Página (default 1)
 * @param {number}        limit       - Registros por página (default 8)
 * @param {string|number} id_proyecto - Filtro por proyecto ('' = sin filtro)
 * @param {string}        rut         - Filtro por rut del trabajador ('' = sin filtro)
 * @returns {Promise<{
 *   status: { total, page, limit, totalPages },
 *   data: Array<{
 *     id_accidente, id_trabajador, id_cuadrilla, nombre_cuadrilla,
 *     fecha_accidente, descripcion, gravedad, traslado, observaciones,
 *     proyecto: { id_proyecto, nombre_proyecto, id_supervisor, supervisor: { nombres, apellidos } },
 *     trabajador: { id_trabajador, rut, nombres, apellidos, sexo, telefono, correo, estado_laboral }
 *   }>
 * }>}
 */
export async function getAllAccidentesAdmin(page = 1, limit = 8, id_proyecto = '', rut = '') {
  const params = new URLSearchParams({ page, limit });
  if (id_proyecto) params.append('id_proyecto', id_proyecto);
  if (rut)         params.append('rut', rut.trim());
  const res = await apiFetch(`/api/accidente_laboral/admin/?${params.toString()}`);
  // handleSuccess envuelve: res.data = { status: {...}, data: [...] }
  return res.data;
}