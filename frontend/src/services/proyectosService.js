const API_BASE = 'http://146.83.198.35:1323';

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

export async function getProyectos({ page = 1, limit = 8, orden = 'nombre_proyecto', filtro = '' } = {}) {
  const params = new URLSearchParams({ page, limit, orden });
  if (filtro) params.append('filtro', filtro);
  return apiFetch(`/api/proyectos/?${params}`); // { data, meta }
}

// Obtener proyectos
export const getLosProyectos = () =>
  apiFetch('/api/proyectos');


export async function crearProyecto(data) {
  const res = await apiFetch('/api/proyectos/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function inactivarProyecto(id_proyecto) {
  return apiFetch(`/api/proyectos/inactivar/${id_proyecto}`, { method: 'DELETE' });
}

export async function reactivarProyecto(id_proyecto) {
  return apiFetch(`/api/proyectos/reactivar/${id_proyecto}`, { method: 'PATCH' });
}

export async function actualizarProyecto(id_proyecto, data) {
  return apiFetch(`/api/proyectos/${id_proyecto}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function cambiarSupervisor(id_proyecto, id_trabajador) {
  return apiFetch('/api/proyectos/supervisor/', {
    method: 'PATCH',
    body: JSON.stringify({ id_proyecto, id_trabajador }),
  });
}

export async function removerSupervisor(id_proyecto) {
  return apiFetch(`/api/proyectos/supervisor/${id_proyecto}`, { method: 'DELETE' });
}

export async function getClientes() {
  const res = await apiFetch('/api/clientes');
  return Array.isArray(res) ? res : []; // Aca se hizo el cambio de res.data a res, ya que el back no devuelve .data, sino que devuelve el arreglo de una.
}

export async function getSupervisoresSinProyecto() {
  const res = await apiFetch('/api/trabajadores/supervisoresSinProyecto/');
  return Array.isArray(res.data) ? res.data : [];
}

export async function getTrabajadorById(id) {
  const res = await apiFetch(`/api/trabajadores/${id}`);
  return res.data;
}