

import { handleErrorClient } from "../handlers/responseHandlers.js";



const ESTADOS_PAGO_VALIDOS     = ["pendiente", "pagado", "atrasado"];
const TIPOS_CONTRATO_VALIDOS   = ["Indefinido", "Plazo Fijo"];
const ESTADOS_CONTRATO_VALIDOS = ["Activo", "Inactivo", "Por vencer"];



export function validateGetRemuneraciones(req, res, next) {
  // 1. Solo administrador
  if (req.user.tipo_usuario !== "administrador") {
    return handleErrorClient(res, 403, "Solo el administrador puede acceder a esta información.");
  }

  const { page, limit, estado_pago, tipo_contrato, estado_contrato, filter_contratos_sin_remuneracion } = req.query;

  // 2. page
  if (page !== undefined) {
    const p = Number(page);
    if (!Number.isInteger(p) || p < 1) {
      return handleErrorClient(res, 400, "El parámetro 'page' debe ser un entero positivo.");
    }
  }

  // 3. limit
  if (limit !== undefined) {
    const l = Number(limit);
    if (!Number.isInteger(l) || l < 1) {
      return handleErrorClient(res, 400, "El parámetro 'limit' debe ser un entero positivo.");
    }
  }

  // 4. estado_pago
  if (estado_pago !== undefined && !ESTADOS_PAGO_VALIDOS.includes(estado_pago)) {
    return handleErrorClient(
      res, 400,
      `El parámetro 'estado_pago' debe ser uno de: ${ESTADOS_PAGO_VALIDOS.join(", ")}.`
    );
  }

  // 5. tipo_contrato
  if (tipo_contrato !== undefined && !TIPOS_CONTRATO_VALIDOS.includes(tipo_contrato)) {
    return handleErrorClient(
      res, 400,
      `El parámetro 'tipo_contrato' debe ser uno de: ${TIPOS_CONTRATO_VALIDOS.join(", ")}.`
    );
  }

  // 6. estado_contrato
  if (estado_contrato !== undefined && !ESTADOS_CONTRATO_VALIDOS.includes(estado_contrato)) {
    return handleErrorClient(
      res, 400,
      `El parámetro 'estado_contrato' debe ser uno de: ${ESTADOS_CONTRATO_VALIDOS.join(", ")}.`
    );
  }

    if (filter_contratos_sin_remuneracion !== undefined &&
        filter_contratos_sin_remuneracion !== "true" &&
        filter_contratos_sin_remuneracion !== "false") {
        return handleErrorClient(res, 400, "El parámetro 'filter_contratos_sin_remuneracion' debe ser 'true' o 'false'.");
    }

  next();
}



export function validateCrearRemuneracion(req, res, next) {
  // 1. Solo administrador
  if (req.user.tipo_usuario !== "administrador") {
    return handleErrorClient(res, 403, "Solo el administrador puede crear remuneraciones.");
  }

  const { id_trabajador, id_contrato, fecha_pago, sueldo } = req.body;

  // 2. Campos requeridos presentes
  if (!id_trabajador || !id_contrato || !fecha_pago || sueldo === undefined) {
    return handleErrorClient(res, 400, "Los campos id_trabajador, id_contrato, fecha_pago y sueldo son requeridos.");
  }

  // 3. id_trabajador e id_contrato deben ser enteros positivos
  if (!Number.isInteger(Number(id_trabajador)) || Number(id_trabajador) < 1) {
    return handleErrorClient(res, 400, "El campo 'id_trabajador' debe ser un entero positivo.");
  }
  if (!Number.isInteger(Number(id_contrato)) || Number(id_contrato) < 1) {
    return handleErrorClient(res, 400, "El campo 'id_contrato' debe ser un entero positivo.");
  }

  // 4. sueldo debe ser entero positivo
  if (!Number.isInteger(Number(sueldo)) || Number(sueldo) < 1) {
    return handleErrorClient(res, 400, "El campo 'sueldo' debe ser un entero positivo.");
  }

  // 5. fecha_pago formato YYYY-MM-DD y no anterior a hoy
  const regexFecha = /^\d{4}-\d{2}-\d{2}$/;
  if (!regexFecha.test(fecha_pago)) {
    return handleErrorClient(res, 400, "El campo 'fecha_pago' debe tener el formato YYYY-MM-DD.");
  }

  const hoy        = new Date().toISOString().split("T")[0];
  if (fecha_pago < hoy) {
    return handleErrorClient(res, 400, "La fecha de pago no puede ser anterior a hoy.");
  }

  next();
}




export function validateActualizarRemuneracion(req, res, next) {
  // 1. Solo administrador
  if (req.user.tipo_usuario !== "administrador") {
    return handleErrorClient(res, 403, "Solo el administrador puede actualizar remuneraciones.");
  }

  const { bono, descuento, estado_pago } = req.body;

  // 2. Debe venir al menos un campo a actualizar
  if (bono === undefined && descuento === undefined && estado_pago === undefined) {
    return handleErrorClient(res, 400, "Debe enviar al menos uno de los campos: bono, descuento, estado_pago.");
  }

  // 3. bono entero no negativo
  if (bono !== undefined) {
    if (!Number.isInteger(Number(bono)) || Number(bono) < 0) {
      return handleErrorClient(res, 400, "El campo 'bono' debe ser un entero no negativo.");
    }
  }

  // 4. descuento entero no negativo
  if (descuento !== undefined) {
    if (!Number.isInteger(Number(descuento)) || Number(descuento) < 0) {
      return handleErrorClient(res, 400, "El campo 'descuento' debe ser un entero no negativo.");
    }
  }

  // 5. estado_pago valor válido
  if (estado_pago !== undefined && !ESTADOS_PAGO_VALIDOS.includes(estado_pago)) {
    return handleErrorClient(
      res, 400,
      `El campo 'estado_pago' debe ser uno de: ${ESTADOS_PAGO_VALIDOS.join(", ")}.`
    );
  }

  next();
}



export function validateEliminarRemuneracion(req, res, next) {
  if (req.user.tipo_usuario !== "administrador") {
    return handleErrorClient(res, 403, "Solo el administrador puede eliminar remuneraciones.");
  }
  next();
}