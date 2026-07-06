"use strict";

import { AppDataSource } from "../config/configDb.js";
import { AnexoContratoProyectoSchema } from "../entities/anexo_contrato_proyecto.entity.js";
import { ContratoProyectoSchema } from "../entities/contrato_proyecto.entity.js";
import {
  validarCrearAnexo,
  validarContratoParaAnexo,
} from "../validations/anexo_contrato_proyecto.validation.js";

const anexoRepository = AppDataSource.getRepository(AnexoContratoProyectoSchema);
const contratoProyectoRepository = AppDataSource.getRepository(ContratoProyectoSchema);

function esAdministrador(req) {
  return req.user?.tipo_usuario === "administrador";
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
      fecha_vigencia,
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
      fecha_vigencia,
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
 * Elimina un anexo de contrato de proyecto.
 * Validaciones:
 * - El que hace la peticion debe tener tipo_usuario = administrador
 * - El anexo debe existir
 */
export const eliminarAnexo = async (req, res) => {
  try {
    if (!esAdministrador(req)) {
      return res.status(403).json({
        message: "No tiene permisos para realizar esta acción",
      });
    }

    const { id_anexo } = req.params;
    if (isNaN(Number(id_anexo))) {
      return res.status(400).json({ message: "id_anexo debe ser numérico" });
    }

    const anexo = await anexoRepository.findOne({
      where: { id_anexo_contrato_proyecto: Number(id_anexo) },
    });
    if (!anexo) {
      return res.status(404).json({ message: "Anexo no encontrado" });
    }

    await anexoRepository.remove(anexo);

    return res.status(200).json({ message: "Anexo eliminado correctamente" });
  } catch (error) {
    console.error("Error en eliminarAnexo:", error);
    return res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};