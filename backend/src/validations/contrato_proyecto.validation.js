"use strict";

export const ESTADOS_VALIDOS = ["activo", "por_vencer", "inactivo"];

function hoyLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Campos que SÍ se pueden editar directamente en un contrato existente.
// fecha_inicio, fecha_termino y monto requieren crear un anexo.
// estado_contrato también queda bloqueado para edición directa: la única
// forma de pasar un contrato a "inactivo" es a través de un anexo (mismo
// patrón que ContratoTrabajador). Esto evita que el admin cierre un
// contrato sin dejar registro del motivo/fecha de término real.
export const CAMPOS_SOLO_VIA_ANEXO = ["fecha_inicio", "fecha_termino", "monto", "estado_contrato"];

/***
 * Valida el body para crear un contrato de proyecto.
 * Devuelve { errores: string[] } — si errores.length === 0, el body es válido.
 */
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

  if (isNaN(Number(id_proyecto))) {
    errores.push("id_proyecto debe ser numérico");
  }

  if (!ESTADOS_VALIDOS.includes(estado_contrato)) {
    errores.push(`estado_contrato debe ser uno de: ${ESTADOS_VALIDOS.join(", ")}`);
  }

  if (Number.isNaN(Number(monto))) {
    errores.push("monto debe ser numérico");
  }

  if (fecha_termino && fecha_inicio && new Date(fecha_termino) <= new Date(fecha_inicio)) {
    errores.push("fecha_termino debe ser posterior a fecha_inicio");
  }

  // Esta validación de "no anterior a hoy" SOLO aplica al crear (igual que
  // en ContratoTrabajador). Al editar no se toca fecha_inicio directamente
  // (va bloqueada en CAMPOS_SOLO_VIA_ANEXO), así que no aplica ahí.
  if (fecha_inicio && fecha_inicio < hoyLocal()) {
    errores.push("La fecha de inicio no puede ser anterior a hoy");
  }

  return errores;
}

/***
 * Valida el body para actualizar (edición directa) un contrato de proyecto.
 * Recibe el contrato actual (de BD) para poder comparar valores y detectar
 * intentos reales de cambio en campos bloqueados.
 *
 * Muta req.body: elimina los campos bloqueados cuando llegan con el mismo
 * valor que ya tenían (reenvíos silenciosos del frontend), y deja el resto
 * intacto para que el controller los aplique.
 *
 * Devuelve { errores: string[] }.
 */
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

    if (campo === "estado_contrato") {
      errores.push(
        'No se puede modificar "estado_contrato" desde la edición directa. Para inactivar (o reactivar) el contrato debes crear un anexo.'
      );
    } else {
      errores.push(
        `No se puede modificar "${campo}" desde la edición directa. Para cambiar fechas o monto debes crear un anexo.`
      );
    }
  }

  if (errores.length) return errores;

  const { descripcion } = body;

  if (descripcion === undefined) {
    errores.push("Debe enviar al menos un campo para actualizar (descripcion)");
  }

  return errores;
}

/***
 * Valida que un contrato de proyecto pueda ser eliminado.
 * Regla de negocio: solo se pueden eliminar contratos en estado "inactivo".
 * Para inactivar un contrato activo/por_vencer, se debe crear un anexo que
 * lo marque como finalizado (ver anexo_contrato_proyecto.validation.js).
 */
export function validarEliminarContratoProyecto(contrato) {
  const errores = [];

  if (contrato.estado_contrato !== "inactivo") {
    errores.push(
      "Solo se pueden eliminar contratos en estado Inactivo. Para inactivar este contrato, crea un anexo marcando la opción de finalizar el contrato."
    );
  }

  return errores;
}