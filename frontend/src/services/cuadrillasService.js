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

// ── ACCIONES DEL ADMINISTRADOR ─────────────────────────────────────────────

// Crea el escuadrón vacío (id_proyecto, nombre_cuadrilla, estado)
export const crearCuadrilla = (datos) =>
  apiFetch('/api/cuadrilla', {
    method: 'POST',
    body: JSON.stringify(datos),
  });

export async function inactivarCuadrilla(id_cuadrilla) {
  return apiFetch("/api/cuadrilla/inactivar/", {
    method: "DELETE",
    body: JSON.stringify({ id_cuadrilla }),
  });
}

// Eliminar una cuadrilla
export const eliminarCuadrilla = (idCuadrilla) =>
  apiFetch(`/api/cuadrilla/${idCuadrilla}`, {
    method: 'DELETE',
  });

export async function reactivarCuadrilla(id_cuadrilla) {
  return apiFetch("/api/cuadrilla/reactivar/", {
    method: "PATCH",
    body: JSON.stringify({ id_cuadrilla }),
  });
}

// Cambia el nombre del equipo
export const editarNombreCuadrilla = (datos) =>
  apiFetch('/api/cuadrilla/cambiarNombre', {
    method: 'PATCH',
    body: JSON.stringify(datos),
  });

// ASIGNACIÓN DE SUPERVISOR (Paso 2 del Administrador)
export const agregarSupervisorCuadrilla = (id_trabajador, id_cuadrilla, cargo_operativo = '', tipo_jornada = 'Diurna') =>
  apiFetch('/api/cuadrilla/supervisor', {
    method: 'POST',
    body: JSON.stringify({ id_trabajador, id_cuadrilla, cargo_operativo, tipo_jornada }),
  });

export const eliminarSupervisorCuadrilla = (id_trabajador, id_cuadrilla) =>
  apiFetch('/api/cuadrilla/supervisor', {
    method: 'DELETE',
    body: JSON.stringify({ id_trabajador, id_cuadrilla }),
  });

// Ver todas las cuadrillas de un proyecto (Vista Admin)
export const getAllCuadrillasAndWorkersByIdProyecto = (id_proyecto) =>
  apiFetch(`/api/cuadrilla/cuadrillas/${id_proyecto}`);


// ── ACCIONES DE SUPERVISOR O ADMINISTRADOR ──────────────────────────────────

// ASIGNACIÓN DE TRABAJADORES (Paso 3 - Armando el grueso del escuadrón)
export const agregarTrabajadorCuadrilla = (id_trabajador, id_cuadrilla, cargo_operativo = '', tipo_jornada = 'Diurna') =>
  apiFetch('/api/cuadrilla/trabajador', {
    method: 'POST',
    body: JSON.stringify({ id_trabajador, id_cuadrilla, cargo_operativo, tipo_jornada }),
  });

export const eliminarTrabajadorCuadrilla = (id_trabajador, id_cuadrilla) =>
  apiFetch('/api/cuadrilla/trabajador', {
    method: 'DELETE',
    body: JSON.stringify({ id_trabajador, id_cuadrilla }),
  });

// Roles especiales dentro del equipo (Bodeguero)
export const asignarBodeguero = (id_trabajador, id_cuadrilla) =>
  apiFetch('/api/cuadrilla/bodeguero', {
    method: 'POST',
    body: JSON.stringify({ id_trabajador, id_cuadrilla }),
  });

export const despojarBodeguero = (id_trabajador, id_cuadrilla) =>
  apiFetch('/api/cuadrilla/bodeguero', {
    method: 'DELETE',
    body: JSON.stringify({ id_trabajador, id_cuadrilla }),
  });


// ── CONSULTAS GENERALES ─────────────────────────────────────────────────────

// Ver a qué cuadrillas pertenezco yo (Basado en el Token)
export const getMyCuadrillasAndWorkersFromIdProyecto = (id_proyecto) =>
  apiFetch(`/api/cuadrilla/misCuadrillas/${id_proyecto}`);

// Ver el listado de compañeros de equipo
export const getIntegrantesOfCuadrilla = (id_cuadrilla) =>
  apiFetch(`/api/cuadrilla/verIntegrantes/${id_cuadrilla}`);

// Obtener la data básica de una sola cuadrilla
export const getCuadrillaData = (id_cuadrilla) =>
  apiFetch(`/api/cuadrilla/${id_cuadrilla}`);

// La cuadrilla propia del trabajador autenticado (necesaria para crear una ausencia propia)
export const getMiCuadrilla = () =>
  apiFetch('/api/cuadrilla/miCuadrilla');

// Ver todas las cuadrillas (con sus integrantes) de los proyectos que superviso (vista "Mis Asignaciones" del supervisor)
export const getMyCuadrillasAndIntegrantesFromToken = () =>
  apiFetch('/api/cuadrilla/supervisor/misCuadrillasAndIntegrantes');

// Ver mis propias ausencias (vista "Mis Ausencias")
export const getAusenciasPorTrabajador = (id) =>
  apiFetch(`/api/ausencias/trabajador/${id}`);