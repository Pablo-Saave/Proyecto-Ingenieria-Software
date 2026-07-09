"use strict";

function hoyLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/***
 * Valida el body para crear un anexo de contrato de proyecto.
 * Devuelve { errores: string[] } — si errores.length === 0, el body es válido.
 *
 * Campos:
 * - fecha_anexo, motivo, descripcion_modificacion: obligatorios.
 *   fecha_anexo es la fecha de firma/registro del anexo: debe ser HOY,
 *   nunca pasada ni futura (mismo criterio que ContratoTrabajador). Como
 *   los efectos se aplican de inmediato al guardar, no tiene sentido que
 *   sea otra fecha.
 * - monto_nuevo: opcional, numérico
 * - observaciones: opcional
 * - fecha_termino_nueva: opcional (date). Si viene, el controller debe
 *   actualizar contrato.fecha_extension a este valor (es la nueva fecha
 *   hasta la cual queda vigente el contrato). Si NO viene, el anexo no
 *   modifica el plazo del contrato y fecha_extension queda intacta.
 * - finaliza_contrato: opcional (boolean). Si viene en true, el controller
 *   debe pasar el contrato asociado a estado "inactivo" (es la única vía
 *   permitida para inactivar un contrato de proyecto, ver
 *   contrato_proyecto.validation.js -> validarEliminarContratoProyecto y
 *   CAMPOS_SOLO_VIA_ANEXO).
 */
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
    errores.push(
      "Los campos fecha_anexo, motivo y descripcion_modificacion son obligatorios"
    );
    return errores;
  }

  if (fecha_anexo !== hoyLocal()) {
    errores.push("fecha_anexo debe ser la fecha de hoy");
    return errores;
  }

  if (monto_nuevo !== undefined && monto_nuevo !== null && monto_nuevo !== "" && isNaN(Number(monto_nuevo))) {
    errores.push("monto_nuevo debe ser numérico");
  }

  if (fecha_termino_nueva !== undefined && fecha_termino_nueva !== null && fecha_termino_nueva !== "") {
    if (isNaN(new Date(fecha_termino_nueva).getTime())) {
      errores.push("fecha_termino_nueva debe ser una fecha válida");
    } else if (fecha_termino_nueva < fecha_anexo) {
      errores.push("fecha_termino_nueva no puede ser anterior a fecha_anexo");
    }
  }

  if (finaliza_contrato !== undefined && typeof finaliza_contrato !== "boolean") {
    errores.push("finaliza_contrato debe ser un valor booleano");
  }

  return errores;
}

/***
 * Valida que un contrato pueda recibir un nuevo anexo.
 * Regla de negocio: no tiene sentido anexar un contrato ya inactivo.
 */
export function validarContratoParaAnexo(contrato) {
  const errores = [];

  if (contrato.estado_contrato === "inactivo") {
    errores.push("No se puede crear un anexo para un contrato que ya está Inactivo");
  }

  return errores;
}