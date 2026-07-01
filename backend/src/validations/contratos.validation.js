// validations/contratos.validation.js

export const TIPOS_CONTRATO   = ['Indefinido', 'Plazo Fijo'];
export const ESTADOS_CONTRATO = ['Activo', 'Inactivo', 'Por vencer'];
export const ESTADOS_ELIMINABLES = ['Inactivo'];

function hoyLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function esFechaValida(str) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = new Date(str + 'T00:00:00');
  return !isNaN(d.getTime());
}

export function validarCrearContrato(req, res, next) {
  const errores = [];
  const { tipo_contrato, estado_contrato, fecha_inicio, fecha_termino, monto, id_trabajador } = req.body;

  if (!tipo_contrato)   errores.push('El campo tipo_contrato es obligatorio.');
  if (!estado_contrato) errores.push('El campo estado_contrato es obligatorio.');
  if (!fecha_inicio)    errores.push('El campo fecha_inicio es obligatorio.');
  if (monto === undefined || monto === null || monto === '') errores.push('El campo monto es obligatorio.');
  if (!id_trabajador)   errores.push('El campo id_trabajador es obligatorio.');

  if (errores.length) {
    return res.status(400).json({ status: 'error', message: errores.join(' ') });
  }

  if (!TIPOS_CONTRATO.includes(tipo_contrato)) {
    errores.push(`tipo_contrato inválido. Valores permitidos: ${TIPOS_CONTRATO.join(', ')}.`);
  }

  if (!ESTADOS_CONTRATO.includes(estado_contrato)) {
    errores.push(`estado_contrato inválido. Valores permitidos: ${ESTADOS_CONTRATO.join(', ')}.`);
  }

  if (!esFechaValida(fecha_inicio)) {
    errores.push('fecha_inicio no es una fecha válida (formato YYYY-MM-DD).');
  } else if (fecha_inicio < hoyLocal()) {
    errores.push('La fecha de inicio no puede ser anterior a hoy.');
  }

  if (monto !== undefined && monto !== null && monto !== '' && Number.isNaN(Number(monto))) {
    errores.push('monto debe ser numérico.');
  }

  if (tipo_contrato === 'Indefinido' && fecha_termino) {
    errores.push('Un contrato Indefinido no puede tener fecha de término.');
  }

  if (tipo_contrato === 'Plazo Fijo') {
    if (!fecha_termino) {
      errores.push('Un contrato de Plazo Fijo debe tener fecha de término.');
    } else if (!esFechaValida(fecha_termino)) {
      errores.push('fecha_termino no es una fecha válida (formato YYYY-MM-DD).');
    } else if (esFechaValida(fecha_inicio) && fecha_termino <= fecha_inicio) {
      errores.push('La fecha de término debe ser posterior a la fecha de inicio.');
    }
  }

  if (errores.length) {
    return res.status(400).json({ status: 'error', message: errores.join(' ') });
  }

  if (tipo_contrato === 'Indefinido') req.body.fecha_termino = null;

  if (monto !== undefined && monto !== null && monto !== '') {
    req.body.monto = Number(monto);
  }

  next();
}

export function validarActualizarContrato(req, res, next) {
  const errores = [];
  const { tipo_contrato, estado_contrato, fecha_inicio, fecha_termino } = req.body;

  if (tipo_contrato !== undefined && !TIPOS_CONTRATO.includes(tipo_contrato)) {
    errores.push(`tipo_contrato inválido. Valores permitidos: ${TIPOS_CONTRATO.join(', ')}.`);
  }

  if (estado_contrato !== undefined && !ESTADOS_CONTRATO.includes(estado_contrato)) {
    errores.push(`estado_contrato inválido. Valores permitidos: ${ESTADOS_CONTRATO.join(', ')}.`);
  }

  if (fecha_inicio !== undefined) {
    if (!esFechaValida(fecha_inicio)) {
      errores.push('fecha_inicio no es una fecha válida (formato YYYY-MM-DD).');
    } else if (fecha_inicio < hoyLocal()) {
      errores.push('La fecha de inicio no puede ser anterior a hoy.');
    }
  }

  if (fecha_termino !== undefined && fecha_termino !== null && fecha_termino !== '') {
    if (!esFechaValida(fecha_termino)) {
      errores.push('fecha_termino no es una fecha válida (formato YYYY-MM-DD).');
    } else if (fecha_inicio && esFechaValida(fecha_inicio) && fecha_termino <= fecha_inicio) {
      errores.push('La fecha de término debe ser posterior a la fecha de inicio.');
    }
  }

  if (tipo_contrato === 'Indefinido' && fecha_termino) {
    errores.push('Un contrato Indefinido no puede tener fecha de término.');
  }

  if (errores.length) {
    return res.status(400).json({ status: 'error', message: errores.join(' ') });
  }

  if (tipo_contrato === 'Indefinido') req.body.fecha_termino = null;

  next();
}

export function validarEliminarContrato(req, res, next) {
  const contrato = req.contrato;

  if (!contrato) {
    return res.status(404).json({ status: 'error', message: 'Contrato no encontrado.' });
  }

  if (!ESTADOS_ELIMINABLES.includes(contrato.estado_contrato)) {
    return res.status(400).json({
      status: 'error',
      message: `Solo se pueden eliminar contratos con estado "Inactivo". Estado actual: "${contrato.estado_contrato}".`,
    });
  }

  next();
}