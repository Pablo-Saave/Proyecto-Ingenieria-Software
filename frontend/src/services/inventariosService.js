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

export async function getMiProyecto() {
  const res = await apiFetch('/api/proyectos/supervisor/miProyecto/');
  return res.data;
}

export async function getInventarios({ page = 1, limit = 8 } = {}) {
  const params = new URLSearchParams({ page, limit });
  return apiFetch(`/api/inventario/?${params}`); // { status, data, meta }
}

export async function getLowStockInventarios({ page = 1, limit = 8 } = {}) {
  const params = new URLSearchParams({ page, limit });
  return apiFetch(`/api/inventario/lowStock/?${params}`); // { status, data, meta }
}

export async function crearInventario(nombre_inventario) {
  return apiFetch('/api/inventario/', {
    method: 'POST',
    body: JSON.stringify({ nombre_inventario }),
  });
}

export async function eliminarInventario(id_inventario) {
  return apiFetch('/api/inventario/', {
    method: 'DELETE',
    body: JSON.stringify({ id_inventario }),
  });
}

export async function getMateriales(id_inventario, { page = 1, limit = 10 } = {}) {
  const params = new URLSearchParams({ page, limit });
  return apiFetch(`/api/inventario/${id_inventario}?${params}`); // { status, data, meta }
}

export async function crearMaterial(data) {
  return apiFetch('/api/inventario/material/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function actualizarMaterial(id_material, data) {
  return apiFetch(`/api/inventario/material/${id_material}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function eliminarMaterial(id_material) {
  return apiFetch(`/api/inventario/material/${id_material}`, {
    method: 'DELETE',
  });
}