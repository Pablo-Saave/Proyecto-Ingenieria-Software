"use strict";

export const ESTADOS_VALIDOS = ["activo", "por_vencer", "inactivo"];
export const DIAS_UMBRAL_POR_VENCER = 30;
export const CAMPOS_SOLO_VIA_ANEXO = ["fecha_inicio", "fecha_termino", "monto", "estado_contrato"];

export function hoyLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function normalizarPaginacion({ page = 1, limit = 10 }) {
  const pageNum = Number(page);
  const limitNum = Number(limit);

  return {
    page: Number.isNaN(pageNum) || pageNum < 1 ? 1 : pageNum,
    limit: Number.isNaN(limitNum) || limitNum < 1 ? 10 : limitNum,
  };
}

export function validarIdNumerico(id, nombre = "id") {
  return Number.isNaN(Number(id)) ? [`${nombre} debe ser numerico`] : [];
}

export function validarCrearContratoProyecto(body) {
  const errores = [];
  const {
    id_proyecto,
    descripcion,
    fecha_inicio,
    fecha_termino,
    estado_contrato,
    monto,
  } = body;

  if (!id_proyecto || !descripcion || !fecha_inicio || !fecha_termino || !estado_contrato ||
      monto === undefined || monto === null || monto === "") {
    errores.push(
      "Los campos id_proyecto, descripcion, fecha_inicio, fecha_termino, estado_contrato y monto son obligatorios"
    );
    return errores;
  }

  if (Number.isNaN(Number(id_proyecto))) {
    errores.push("id_proyecto debe ser numerico");
  }

  if (!ESTADOS_VALIDOS.includes(estado_contrato)) {
    errores.push(`estado_contrato debe ser uno de: ${ESTADOS_VALIDOS.join(", ")}`);
  }

  if (Number.isNaN(Number(monto))) {
    errores.push("monto debe ser numerico");
  }

  if (fecha_termino && fecha_inicio && new Date(fecha_termino) <= new Date(fecha_inicio)) {
    errores.push("fecha_termino debe ser posterior a fecha_inicio");
  }

  if (fecha_inicio && fecha_inicio < hoyLocal()) {
    errores.push("La fecha de inicio no puede ser anterior a hoy");
  }

  return errores;
}

export function validarActualizarContratoProyecto(contrato, body) {
  const errores = [];

  for (const campo of CAMPOS_SOLO_VIA_ANEXO) {
    if (body[campo] === undefined) continue;

    const valorNuevo = body[campo];
    const valorActual = contrato[campo];
    const sonIguales =
      valorNuevo === valorActual ||
      (valorNuevo == null && valorActual == null) ||
      String(valorNuevo) === String(valorActual);

    if (sonIguales) {
      delete body[campo];
      continue;
    }

    errores.push(
      campo === "estado_contrato"
        ? 'No se puede modificar "estado_contrato" desde la edicion directa. Para inactivar (o reactivar) el contrato debes crear un anexo.'
        : `No se puede modificar "${campo}" desde la edicion directa. Para cambiar fechas o monto debes crear un anexo.`
    );
  }

  if (errores.length) return errores;

  if (body.descripcion === undefined) {
    errores.push("Debe enviar al menos un campo para actualizar (descripcion)");
  }

  return errores;
}

export function validarEliminarContratoProyecto(contrato) {
  const errores = [];

  if (contrato.estado_contrato !== "inactivo") {
    errores.push(
      "Solo se pueden eliminar contratos en estado Inactivo. Para inactivar este contrato, crea un anexo marcando la opcion de finalizar el contrato."
    );
  }

  return errores;
}