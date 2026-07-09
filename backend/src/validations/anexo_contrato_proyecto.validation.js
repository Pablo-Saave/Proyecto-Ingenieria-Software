"use strict";

function hoyLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function validarCrearAnexo(body) {
  const errores = [];
  const {
    fecha_anexo,
    motivo,
    descripcion_modificacion,
    monto_nuevo,
    fecha_termino_nueva,
    finaliza_contrato,
  } = body;

  if (!fecha_anexo || !motivo || !descripcion_modificacion) {
    errores.push("Los campos fecha_anexo, motivo y descripcion_modificacion son obligatorios");
    return errores;
  }

  if (fecha_anexo !== hoyLocal()) {
    errores.push("fecha_anexo debe ser la fecha de hoy");
    return errores;
  }

  if (monto_nuevo !== undefined && monto_nuevo !== null && monto_nuevo !== "" && Number.isNaN(Number(monto_nuevo))) {
    errores.push("monto_nuevo debe ser numerico");
  }

  if (fecha_termino_nueva !== undefined && fecha_termino_nueva !== null && fecha_termino_nueva !== "") {
    if (Number.isNaN(new Date(fecha_termino_nueva).getTime())) {
      errores.push("fecha_termino_nueva debe ser una fecha valida");
    } else if (fecha_termino_nueva < fecha_anexo) {
      errores.push("fecha_termino_nueva no puede ser anterior a fecha_anexo");
    }
  }

  if (finaliza_contrato !== undefined && typeof finaliza_contrato !== "boolean") {
    errores.push("finaliza_contrato debe ser un valor booleano");
  }

  return errores;
}

export function validarContratoParaAnexo(contrato) {
  const errores = [];

  if (contrato.estado_contrato === "inactivo") {
    errores.push("No se puede crear un anexo para un contrato que ya esta Inactivo");
  }

  return errores;
}
