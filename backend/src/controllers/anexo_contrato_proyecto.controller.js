"use strict";

import { AppDataSource } from "../config/configDb.js";
import { AnexoContratoProyectoSchema } from "../entities/anexo_contrato_proyecto.entity.js";
import { ContratoProyectoSchema } from "../entities/contrato_proyecto.entity.js";
import {
  validarCrearAnexo,
  validarContratoParaAnexo,
} from "../validations/anexo_contrato_proyecto.validation.js";
import { DIAS_UMBRAL_POR_VENCER } from "../validations/contrato_proyecto.validation.js";

const anexoRepository = AppDataSource.getRepository(AnexoContratoProyectoSchema);
const contratoProyectoRepository = AppDataSource.getRepository(ContratoProyectoSchema);

function esAdministrador(req) {
  return req.user?.tipo_usuario === "administrador";
}

// Misma regla que usa el cron: si la fecha de término efectiva (extensión
// si existe, si no la original) cae dentro del umbral, no esperamos a la
// corrida de medianoche para reflejarlo.
function calcularEstadoDesdeFechaTermino(fechaTermino) {
  const hoy = new Date().toISOString().slice(0, 10);
  if (!fechaTermino) return "activo";
  if (fechaTermino < hoy) return "inactivo";

  const limite = new Date();
  limite.setDate(limite.getDate() + DIAS_UMBRAL_POR_VENCER);
  const limiteStr = limite.toISOString().slice(0, 10);

  return fechaTermino <= limiteStr ? "por_vencer" : "activo";
}

/***
 * Lista los anexos de un contrato de proyecto, del mas reciente al mas antiguo.
 * Validaciones:
 * - El que hace la peticion debe tener tipo_usuario = administrador
 * - El contrato debe existir
 */
export const getAnexosByContrato = async (req, res) => {
  try {
    if (!esAdministrador(req)) {
      return res.status(403).json({
        message: "No tiene permisos para realizar esta acción",
      });
    }

    const { id_contrato_proyecto } = req.params;
    if (isNaN(Number(id_contrato_proyecto))) {
      return res.status(400).json({ message: "id_contrato_proyecto debe ser numérico" });
    }

    const contrato = await contratoProyectoRepository.findOne({
      where: { id_contrato_proyecto: Number(id_contrato_proyecto) },
    });
    if (!contrato) {
      return res.status(404).json({ message: "Contrato de proyecto no encontrado" });
    }

    const anexos = await anexoRepository.find({
      where: { id_contrato_proyecto: Number(id_contrato_proyecto) },
      order: { fecha_anexo: "DESC" },
    });

    return res.status(200).json(anexos);
  } catch (error) {
    console.error("Error en getAnexosByContrato:", error);
    return res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};

/***
 * Crea un anexo para un contrato de proyecto (ej: extension de plazo,
 * cambio de monto, modificacion de condiciones, o termino del contrato).
 * Body: fecha_anexo, fecha_vigencia, motivo, descripcion_modificacion,
 *   monto_nuevo (opcional), observaciones (opcional),
 *   fecha_termino_nueva (opcional), finaliza_contrato (opcional, boolean)
 * Efectos secundarios sobre el contrato:
 * - Si viene fecha_termino_nueva, actualiza fecha_extension del contrato a
 *   ese valor (nueva fecha hasta la cual queda vigente el contrato). Si el
 *   anexo no modifica el plazo (ej: solo cambia monto u observaciones), no
 *   se envía este campo y fecha_extension queda intacta.
 * - Si finaliza_contrato === true, ademas pasa estado_contrato a "inactivo".
 *   Esta es la UNICA via permitida para inactivar un contrato de proyecto;
 *   la edición directa del contrato (PATCH) bloquea ese campo a proposito
 *   (ver contrato_proyecto.validation.js).
 * Validaciones (ver anexo_contrato_proyecto.validation.js):
 * - El que hace la peticion debe tener tipo_usuario = administrador
 * - El contrato debe existir
 * - El contrato no debe estar ya inactivo
 * - Los campos obligatorios no deben estar vacios
 */
export const crearAnexo = async (req, res) => {
  try {
    if (!esAdministrador(req)) {
      return res.status(403).json({
        message: "No tiene permisos para realizar esta acción",
      });
    }

    const { id_contrato_proyecto } = req.params;
    if (isNaN(Number(id_contrato_proyecto))) {
      return res.status(400).json({ message: "id_contrato_proyecto debe ser numérico" });
    }

    const errores = validarCrearAnexo(req.body);
    if (errores.length) {
      return res.status(400).json({ message: errores.join(" ") });
    }

    const {
      fecha_anexo,
      motivo,
      descripcion_modificacion,
      monto_nuevo,
      observaciones,
      fecha_termino_nueva,
      finaliza_contrato,
    } = req.body;

    const contrato = await contratoProyectoRepository.findOne({
      where: { id_contrato_proyecto: Number(id_contrato_proyecto) },
    });
    if (!contrato) {
      return res.status(404).json({ message: "Contrato de proyecto no encontrado" });
    }

    const erroresContrato = validarContratoParaAnexo(contrato);
    if (erroresContrato.length) {
      return res.status(400).json({ message: erroresContrato.join(" ") });
    }

    const nuevoAnexo = anexoRepository.create({
      id_contrato_proyecto: Number(id_contrato_proyecto),
      fecha_anexo,
      motivo,
      descripcion_modificacion,
      monto_nuevo: monto_nuevo !== undefined && monto_nuevo !== null && monto_nuevo !== ""
        ? Number(monto_nuevo)
        : null,
      fecha_termino_nueva: fecha_termino_nueva || null,
      observaciones: observaciones || null,
    });

    await anexoRepository.save(nuevoAnexo);

    if (fecha_termino_nueva) {
      contrato.fecha_extension = fecha_termino_nueva;
    }
    if (finaliza_contrato === true) {
      contrato.estado_contrato = "inactivo";
    } else {
      // Recalcula el estado en base a la fecha de término vigente
      // (extensión si existe, si no la original), igual regla que el cron,
      // para no esperar a medianoche.
      const fechaTerminoVigente = contrato.fecha_extension || contrato.fecha_termino;
      contrato.estado_contrato = calcularEstadoDesdeFechaTermino(fechaTerminoVigente);
    }
    await contratoProyectoRepository.save(contrato);

    return res.status(201).json({
      message: "Anexo creado correctamente",
      data: nuevoAnexo,
    });
  } catch (error) {
    console.error("Error en crearAnexo:", error);
    return res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};

/***
 * Eliminar un anexo está deshabilitado a propósito: un anexo aplicó
 * cambios reales al contrato (extensión de plazo, monto o incluso su
 * cierre a inactivo). Borrarlo dejaría esos cambios sin ningún respaldo
 * en el historial. Si algo quedó mal registrado, se corrige creando OTRO
 * anexo, nunca eliminando el original.
 *
 * Se deja el endpoint (en vez de sacar la ruta) para responder con un
 * mensaje explícito por si queda algún llamado antiguo desde el front.
 */
export const eliminarAnexo = async (req, res) => {
  return res.status(403).json({
    message:
      "Los anexos no se pueden eliminar: forman parte del historial del contrato. " +
      "Si hay un error, corrígelo creando un nuevo anexo.",
  });
};