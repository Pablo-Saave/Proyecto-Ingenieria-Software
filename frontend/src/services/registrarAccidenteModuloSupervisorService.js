// services/registrarAccidenteModuloSupervisorService.js

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
 * getMiProyectoParaRegistro
 * GET /api/proyectos/supervisor/miProyecto/
 *
 * @returns {Promise<{ id_proyecto, nombre_proyecto, estado, ... }>}
 */
export async function getMiProyectoParaRegistro() {
  const res = await apiFetch('/api/proyectos/supervisor/miProyecto/');
  return res.data;
}

/**
 * getMisCuadrillasConIntegrantes
 * GET /api/cuadrilla/supervisor/misCuadrillasAndIntegrantes
 * Sin params de paginación → devuelve todo en una sola respuesta.
 *
 * @returns {Promise<Array<{
 *   id_cuadrilla, id_proyecto, nombre_cuadrilla, fecha_creacion, estado,
 *   integrantes: Array<{ id_trabajador, rut, nombres, apellidos, telefono,
 *                        correo, estado_laboral, cargo_operativo, tipo_jornada }>
 * }>>}
 */
export async function getMisCuadrillasConIntegrantes() {
  const res = await apiFetch('/api/cuadrilla/supervisor/misCuadrillasAndIntegrantes');
  return Array.isArray(res.data) ? res.data : [];
}

/**
 * registrarAccidenteLaboral
 * POST /api/accidente_laboral/supervisor/
 *
 * @param {{
 *   id_trabajador:   number,
 *   id_cuadrilla:    number,
 *   fecha_accidente: string,   (YYYY-MM-DD)
 *   descripcion:     string,
 *   gravedad:        string,
 *   traslado:        string,
 *   observaciones?:  string
 * }} data
 * @returns {Promise<{ id_accidente, id_trabajador, id_cuadrilla,
 *   fecha_accidente, descripcion, gravedad, traslado, observaciones }>}
 */
export async function registrarAccidenteLaboral(data) {
  const res = await apiFetch('/api/accidente_laboral/supervisor/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}