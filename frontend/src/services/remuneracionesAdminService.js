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

// Retorna { data: Trabajador[], meta: { total, page, limit, totalPages } }
// Cada trabajador trae contratos → { remuneraciones[], anexos[] }
export async function getRemuneraciones(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  });
  const res = await apiFetch(`/api/remuneraciones/all/?${qs.toString()}`);
  return {
    data: Array.isArray(res.data?.data) ? res.data.data : [],
    meta: res.data?.meta ?? { total: 0, page: 1, limit: 10, totalPages: 0 },
  };
}

// Crea una remuneracion. bono/descuento/estado_pago se asignan por defecto en el backend.
export async function crearRemuneracion(data) {
  const res = await apiFetch('/api/remuneraciones/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

// Actualiza parcialmente una remuneracion (bono, descuento, estado_pago).
export async function actualizarRemuneracion(id, data) {
  const res = await apiFetch(`/api/remuneraciones/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return res.data;
}

// Elimina una remuneracion
export async function eliminarRemuneracion(id) {
  await apiFetch(`/api/remuneraciones/${id}`, { method: 'DELETE' });
  return true;
}