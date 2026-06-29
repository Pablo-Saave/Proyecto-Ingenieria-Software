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

export async function getTrabajadores() {
  const res = await apiFetch('/api/trabajadores');
  return Array.isArray(res.data) ? res.data : [];
}

export async function getTrabajadorById(id) {
  const res = await apiFetch(`/api/trabajadores/${id}`);
  return res.data;
}

export async function createTrabajador(data) {
  const res = await apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function updateTrabajador(id, data) {
  const res = await apiFetch(`/api/trabajadores/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function deleteTrabajador(id) {
  await apiFetch(`/api/trabajadores/${id}`, { method: 'DELETE' });
  return true;
}
