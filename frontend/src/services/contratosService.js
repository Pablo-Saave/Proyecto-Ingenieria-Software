// src/services/contratosService.js

const API_BASE = 'http://localhost:3000';

// Función base idéntica al patrón del resto del proyecto
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

// GET /api/contratos  → { status: "success", data: [...] }
export async function getContratos() {
  const res = await apiFetch('/api/contratos');
  return Array.isArray(res.data) ? res.data : [];
}

// GET /api/contratos/:id  → { status: "success", data: {...} }
export async function getContratoById(id) {
  const res = await apiFetch(`/api/contratos/${id}`);
  return res.data;
}

// POST /api/contratos
// Body obligatorio: { tipo_contrato, estado_contrato, fecha_inicio, id_trabajador }
// Body opcional:   { fecha_termino, observaciones }
export async function createContrato(data) {
  const res = await apiFetch('/api/contratos', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

// PUT /api/contratos/:id
export async function updateContrato(id, data) {
  const res = await apiFetch(`/api/contratos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.data;
}

// DELETE /api/contratos/:id
export async function deleteContrato(id) {
  await apiFetch(`/api/contratos/${id}`, { method: 'DELETE' });
  return true;
}

// GET /api/trabajadores → para el selector del modal
// Responde { status: "success", data: [...] }
export async function getTrabajadores() {
  const res = await apiFetch('/api/trabajadores');
  return Array.isArray(res.data) ? res.data : [];
}