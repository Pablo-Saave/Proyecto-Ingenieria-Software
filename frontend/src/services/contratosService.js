const API_BASE = 'http://146.83.198.35:1323/';

export const TIPOS_CONTRATO = ['Indefinido', 'Plazo Fijo'];
export const ESTADOS_CONTRATO = ['Activo', 'Inactivo', 'Por vencer'];

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

export function hoyLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function validarFormContrato(form, esEdicion = false) {
  const errores = [];
  const { tipo_contrato, estado_contrato, fecha_inicio, fecha_termino, monto, id_trabajador } = form;

  if (!esEdicion && !id_trabajador) errores.push('Debes seleccionar un trabajador.');
  if (!tipo_contrato) errores.push('El tipo de contrato es obligatorio.');
  if (!estado_contrato) errores.push('El estado del contrato es obligatorio.');
  if (!fecha_inicio) errores.push('La fecha de inicio es obligatoria.');

  if (monto === '' || monto === null || monto === undefined) {
    errores.push('El monto del contrato es obligatorio.');
  } else if (Number.isNaN(Number(monto))) {
    errores.push('El monto del contrato debe ser numerico.');
  }

  if (tipo_contrato && !TIPOS_CONTRATO.includes(tipo_contrato)) {
    errores.push(`Tipo invalido. Opciones: ${TIPOS_CONTRATO.join(', ')}.`);
  }

  if (estado_contrato && !ESTADOS_CONTRATO.includes(estado_contrato)) {
    errores.push(`Estado invalido. Opciones: ${ESTADOS_CONTRATO.join(', ')}.`);
  }

  if (fecha_inicio && !esEdicion && fecha_inicio < hoyLocal()) {
    errores.push('La fecha de inicio no puede ser anterior a hoy.');
  }

  if (tipo_contrato === 'Indefinido' && fecha_termino) {
    errores.push('Un contrato Indefinido no puede tener fecha de termino.');
  }

  if (tipo_contrato === 'Plazo Fijo') {
    if (!fecha_termino) {
      errores.push('Un contrato de Plazo Fijo debe tener fecha de termino.');
    } else if (fecha_inicio && fecha_termino <= fecha_inicio) {
      errores.push('La fecha de termino debe ser posterior a la fecha de inicio.');
    }
  }

  return errores;
}

export async function getContratos() {
  const res = await apiFetch('/api/contratos');
  return Array.isArray(res.data) ? res.data : [];
}

export async function getContratoById(id) {
  const res = await apiFetch(`/api/contratos/${id}`);
  return res.data;
}

export async function getMisContratos(id_trabajador) {
  const res = await apiFetch(`/api/contratos/mis-contratos/${id_trabajador}`);
  return Array.isArray(res.data) ? res.data : [];
}

export async function createContrato(data) {
  const res = await apiFetch('/api/contratos', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function updateContrato(id, data) {
  const res = await apiFetch(`/api/contratos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function deleteContrato(id) {
  await apiFetch(`/api/contratos/${id}`, { method: 'DELETE' });
  return true;
}

export async function getTrabajadores() {
  const res = await apiFetch('/api/trabajadores');
  return Array.isArray(res.data) ? res.data : [];
}

export async function createAnexoContrato(idContrato, payload) {
  const res = await apiFetch(`/api/contratos/${idContrato}/anexos`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export function validarFormAnexoContrato(form) {
  const errores = [];

  if (!form.fecha_anexo) {
    errores.push('La fecha del anexo es obligatoria.');
  } else if (form.fecha_anexo !== hoyLocal()) {
    errores.push('La fecha del anexo debe ser hoy.');
  }

  if (!form.motivo || !form.motivo.trim()) errores.push('El motivo es obligatorio.');
  if (!form.descripcion_modificacion || !form.descripcion_modificacion.trim()) {
    errores.push('La descripcion de la modificacion es obligatoria.');
  }

  if (form.tipo_contrato_nuevo && !TIPOS_CONTRATO.includes(form.tipo_contrato_nuevo)) {
    errores.push(`Tipo invalido. Opciones: ${TIPOS_CONTRATO.join(', ')}.`);
  }
  if (form.tipo_contrato_nuevo === 'Plazo Fijo' && !form.fecha_termino_nueva) {
    errores.push('Si cambia el tipo a Plazo Fijo debe indicar la nueva fecha de termino.');
  }
  if (form.tipo_contrato_nuevo === 'Indefinido' && form.fecha_termino_nueva) {
    errores.push('Un contrato Indefinido no puede tener fecha de termino.');
  }
  if (
    form.monto_nuevo !== '' &&
    form.monto_nuevo !== undefined &&
    form.monto_nuevo !== null &&
    Number.isNaN(Number(form.monto_nuevo))
  ) {
    errores.push('El nuevo monto debe ser numerico.');
  }

  return errores;
}
