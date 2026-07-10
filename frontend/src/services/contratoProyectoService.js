const API_BASE = 'http://146.83.198.35:1323/';
const API_PATH = '/api/contratos-proyecto';

export const ESTADOS_CONTRATO_PROYECTO = [
  { value: 'activo', label: 'Activo' },
  { value: 'por_vencer', label: 'Por vencer' },
  { value: 'inactivo', label: 'Inactivo' },
];

function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function manejarRespuesta(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Ocurrio un error al comunicarse con el servidor');
  }
  return data;
}

export function hoyLocal() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
}

export async function getContratosProyecto({ page = 1, limit = 10, estado, search } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (estado && estado !== 'Todos') params.append('estado', estado);
  if (search) params.append('search', search);

  const res = await fetch(`${API_BASE}${API_PATH}?${params.toString()}`, {
    headers: authHeaders(),
  });
  return manejarRespuesta(res);
}

export async function getContratoProyectoDetalle(id) {
  const res = await fetch(`${API_BASE}${API_PATH}/${id}`, { headers: authHeaders() });
  return manejarRespuesta(res);
}

export async function getProyectosDisponibles() {
  const res = await fetch(`${API_BASE}${API_PATH}/proyectos-disponibles`, {
    headers: authHeaders(),
  });
  return manejarRespuesta(res);
}

export async function createContratoProyecto(payload) {
  const res = await fetch(`${API_BASE}${API_PATH}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return manejarRespuesta(res);
}

export async function updateContratoProyecto(id, payload) {
  const res = await fetch(`${API_BASE}${API_PATH}/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return manejarRespuesta(res);
}

export async function deleteContratoProyecto(id) {
  const res = await fetch(`${API_BASE}${API_PATH}/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return manejarRespuesta(res);
}

export async function createAnexo(idContrato, payload) {
  const res = await fetch(`${API_BASE}${API_PATH}/${idContrato}/anexos`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return manejarRespuesta(res);
}

export function validarFormContratoProyecto(form, esEdicion = false) {
  const errores = [];

  if (!esEdicion && !form.id_proyecto) errores.push('Debe seleccionar un proyecto');
  if (!form.descripcion || !form.descripcion.trim()) errores.push('La descripcion es obligatoria');

  if (!form.fecha_inicio) {
    errores.push('La fecha de inicio es obligatoria');
  } else if (!esEdicion && form.fecha_inicio < hoyLocal()) {
    errores.push('La fecha de inicio no puede ser anterior a hoy');
  }

  if (!form.fecha_termino) errores.push('La fecha de termino es obligatoria');

  if (
    form.fecha_inicio &&
    form.fecha_termino &&
    new Date(form.fecha_termino) <= new Date(form.fecha_inicio)
  ) {
    errores.push('La fecha de termino debe ser posterior a la fecha de inicio');
  }

  if (!form.estado_contrato) errores.push('Debe seleccionar un estado');

  if (form.monto === '' || form.monto === null || form.monto === undefined) {
    errores.push('El monto es obligatorio');
  } else if (Number.isNaN(Number(form.monto))) {
    errores.push('El monto debe ser numerico');
  }

  return errores;
}

export function validarFormAnexo(form) {
  const errores = [];

  if (!form.fecha_anexo) {
    errores.push('La fecha del anexo es obligatoria');
  } else if (form.fecha_anexo !== hoyLocal()) {
    errores.push('La fecha del anexo debe ser hoy');
  }

  if (!form.motivo || !form.motivo.trim()) errores.push('El motivo es obligatorio');
  if (!form.descripcion_modificacion || !form.descripcion_modificacion.trim()) {
    errores.push('La descripcion de la modificacion es obligatoria');
  }

  if (form.monto_nuevo !== '' && form.monto_nuevo !== undefined && Number.isNaN(Number(form.monto_nuevo))) {
    errores.push('El monto nuevo debe ser numerico');
  }

  if (form.fecha_termino_nueva && form.fecha_anexo && form.fecha_termino_nueva < form.fecha_anexo) {
    errores.push('La nueva fecha de termino no puede ser anterior a la fecha del anexo');
  }

  return errores;
}
