const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
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

// ── ACCIONES DEL ADMINISTRADOR ─────────────────────────────────────────────

// Listado completo (sin paginar)
export const getRemuneraciones = () => apiFetch('/');

// Listado paginado (vista principal de Pagos admin)
export const getRemuneracionesPaginadas = (page = 1, limit = 10) =>
  apiFetch(`/paginadas/?page=${page}&limit=${limit}`);

// Buscar la remuneración de un trabajador por su RUT
export const getRemuneracionPorRut = (rut) =>
  apiFetch('/get', {
    method: 'POST',
    body: JSON.stringify({ rut }),
  });

// Crear una nueva remuneración
export const crearRemuneracion = (datos) =>
  apiFetch('/', {
    method: 'POST',
    body: JSON.stringify(datos),
  });

// Actualizar una remuneración existente
export const actualizarRemuneracion = (id_remuneracion, datos) =>
  apiFetch(`/${id_remuneracion}`, {
    method: 'PATCH',
    body: JSON.stringify(datos),
  });

// Eliminar una remuneración
export const eliminarRemuneracion = (id_remuneracion) =>
  apiFetch(`/${id_remuneracion}`, {
    method: 'DELETE',
  });

// ── CONSULTAS PROPIAS (Supervisor / Trabajador) ─────────────────────────────
// NOTA: este endpoint aún no existe en el backend. Hay que crear en
// remuneracion.routes.js + remuneracion.controller.js una ruta protegida
// tipo GET /api/remuneraciones/mi-pago que use el id del usuario autenticado
// (req.user, via el token) en vez de recibir el rut por body, para que un
// supervisor o trabajador no pueda consultar el pago de otra persona.
export const getMiRemuneracion = () => apiFetch('/mi-pago');