// src/services/trabajadoresService.js

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

// ── Trabajadores ──────────────────────────────────────────────────────────

// GET /api/trabajadores → { status: "success", data: [...] }
export async function getTrabajadores() {
  const res = await apiFetch('/api/trabajadores');
  return Array.isArray(res.data) ? res.data : [];
}

// GET /api/trabajadores/:id → { status: "success", data: {...} }
export async function getTrabajadorById(id) {
  const res = await apiFetch(`/api/trabajadores/${id}`);
  return res.data;
}

// POST /api/auth/register
// Obligatorio: { tipo_usuario, rut, nombres, apellidos, correo, password }
// Opcional:    { id_etiqueta, sexo, telefono, direccion, fecha_nacimiento, fecha_ingreso, estado_laboral, experiencia_previa }
export async function createTrabajador(data) {
  const res = await apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

// PUT /api/trabajadores/:id
export async function updateTrabajador(id, data) {
  const res = await apiFetch(`/api/trabajadores/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.data;
}

// DELETE /api/trabajadores/:id
export async function deleteTrabajador(id) {
  await apiFetch(`/api/trabajadores/${id}`, { method: 'DELETE' });
  return true;
}

// ── Etiquetas ─────────────────────────────────────────────────────────────

// GET /api/etiquetas → [{ id_etiqueta, nombre_etiqueta, descripcion, ... }]
export async function getEtiquetas() {
  const res = await apiFetch('/api/etiquetas').catch(() => []);
  return Array.isArray(res) ? res : [];
}

// POST /api/etiquetas
// Obligatorio: { nombre_etiqueta }
// Opcional:    { descripcion }
export async function createEtiqueta(data) {
  return apiFetch('/api/etiquetas', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}