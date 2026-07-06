"use strict";

/***
 * Valida el body para crear un anexo de contrato de proyecto.
 * Devuelve { errores: string[] } — si errores.length === 0, el body es válido.
 *
 * Campos:
 * - fecha_anexo, fecha_vigencia, motivo, descripcion_modificacion: obligatorios
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
    fecha_vigencia,
    motivo,
    descripcion_modificacion,
    monto_nuevo,
    fecha_termino_nueva,
    finaliza_contrato,
  } = body;

  if (!fecha_anexo || !fecha_vigencia || !motivo || !descripcion_modificacion) {
    errores.push(
      "Los campos fecha_anexo, fecha_vigencia, motivo y descripcion_modificacion son obligatorios"
    );
    return errores;
  }

  if (new Date(fecha_vigencia) < new Date(fecha_anexo)) {
    errores.push("fecha_vigencia no puede ser anterior a fecha_anexo");
  }

  if (monto_nuevo !== undefined && monto_nuevo !== null && monto_nuevo !== "" && isNaN(Number(monto_nuevo))) {
    errores.push("monto_nuevo debe ser numérico");
  }

  if (fecha_termino_nueva !== undefined && fecha_termino_nueva !== null && fecha_termino_nueva !== "") {
    if (isNaN(new Date(fecha_termino_nueva).getTime())) {
      errores.push("fecha_termino_nueva debe ser una fecha válida");
    } else if (new Date(fecha_termino_nueva) < new Date(fecha_vigencia)) {
      errores.push("fecha_termino_nueva no puede ser anterior a fecha_vigencia");
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