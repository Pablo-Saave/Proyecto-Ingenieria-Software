const API_BASE = import.meta.env.VITE_API_URL ?? 'http://146.83.198.35:1323';

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
    const contentType = res.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || `Error ${res.status}`);
    }
    const errorText = await res.text();
    console.error("ERROR BACKEND REMUNERACION:", errorText);
    throw new Error(errorText);
  }
  return res.json();
}

// GET /api/contratos/mis-contratos/:id_trabajador -> { status, data: [...] }
export const getMisContratos = (id_trabajador) =>
  apiFetch(`/api/contratos/mis-contratos/${id_trabajador}`);

// GET /api/remuneraciones/mi-pago -> objeto de remuneración del usuario autenticado
// (usa el id_trabajador del JWT, no necesita rut)
export const getMiRemuneracion = () =>
  apiFetch('/api/remuneraciones/mi-pago');

  // GET /api/contratos -> { status, data: [...] }
export const getTodosLosContratos = () => 
  apiFetch('/api/contratos');
 
// GET /api/remuneraciones -> array directo (ver getRemuneraciones en tu controller)
export const getTodasLasRemuneraciones = () => 
  apiFetch('/api/remuneraciones');
 
// Trabakadores sin cuadrilla
export const getTrabajadoresSinCuadrilla = () => 
  apiFetch('/api/trabajadores/sinCuadrilla');
 
// Proyectos activos
export const getResumenProyectos = () => 
  apiFetch('/api/proyectos?limit=1000');