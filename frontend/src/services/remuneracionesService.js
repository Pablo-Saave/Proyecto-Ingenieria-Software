const API_BASE = import.meta.env.VITE_API_URL ?? 'http://146.83.198.35:1323/';
const BASE_PATH = '/api/remuneraciones';

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}${BASE_PATH}${path}`, {
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

// ── CONSULTAS PROPIAS (Supervisor / Trabajador) ─────────────────────────────
export const getMiRemuneracion = () => apiFetch('/mi-pago');