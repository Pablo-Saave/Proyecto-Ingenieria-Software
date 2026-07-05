// services/accidenteModuloSupervisorService.js

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
 * getMiProyectoBySupervisor
 * GET /api/proyectos/supervisor/miProyecto/
 *
 * @returns {Promise<{ id_proyecto, id_cliente, id_supervisor, nombre_proyecto,
 *   tipo_instalacion, direccion, nivel_exigencia, cantidad_personal_requerido,
 *   fecha_creacion, estado }>}
 */
export async function getMiProyectoBySupervisor() {
  const res = await apiFetch('/api/proyectos/supervisor/miProyecto/');
  return res.data;
}

/**
 * getMisCuadrillas
 * GET /api/cuadrilla/supervisor/misCuadrillasAndIntegrantes
 * Se usa sin paginación para obtener todas las cuadrillas del proyecto (dropdown).
 *
 * @returns {Promise<Array<{ id_cuadrilla, id_proyecto, nombre_cuadrilla,
 *   fecha_creacion, estado, integrantes: Array }>>}
 */
export async function getMisCuadrillas() {
  const res = await apiFetch('/api/cuadrilla/supervisor/misCuadrillasAndIntegrantes');
  return Array.isArray(res.data) ? res.data : [];
}

/**
 * getAccidentesDelProyecto
 * GET /api/accidente_laboral/supervisor/
 *
 * @param {number} page          - Página (default 1)
 * @param {number} limit         - Registros por página (default 8)
 * @param {string|number} id_cuadrilla - Filtro por cuadrilla ('' = sin filtro)
 * @param {string} rut           - Filtro por rut del trabajador ('' = sin filtro)
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
export async function getAccidentesDelProyecto(page = 1, limit = 8, id_cuadrilla = '', rut = '') {
  const params = new URLSearchParams({ page, limit });
  if (id_cuadrilla) params.append('id_cuadrilla', id_cuadrilla);
  if (rut)          params.append('rut', rut.trim());
  const res = await apiFetch(`/api/accidente_laboral/supervisor/?${params.toString()}`);
  return res.data;
}

/**
 * editarAccidenteLaboralSupervisor
 * PATCH /api/accidente_laboral/supervisor/:id_accidente_laboral
 * Solo envía los campos que realmente cambiaron.
 *
 * @param {number} id   - id_accidente a editar
 * @param {{ descripcion?, gravedad?, traslado?, observaciones? }} data - campos a actualizar
 * @returns {Promise<{ id_accidente, id_trabajador, id_cuadrilla, fecha_accidente,
 *   descripcion, gravedad, traslado, observaciones }>}
 */
export async function editarAccidenteLaboralSupervisor(id, data) {
  const res = await apiFetch(`/api/accidente_laboral/supervisor/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return res.data;
}