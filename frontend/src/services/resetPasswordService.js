const API_BASE = 'http://146.83.198.35:1323/';

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
  return data;
}

export async function solicitarCodigo(correo) {
  return apiFetch('/api/reset/solicitar-reset', {
    method: 'POST',
    body: JSON.stringify({ correo }),
  });
}

export async function verificarCodigo(correo, codigo, nueva_password) {
  return apiFetch('/api/reset/verificar-reset', {
    method: 'POST',
    body: JSON.stringify({ correo, codigo, nueva_password }),
  });
}