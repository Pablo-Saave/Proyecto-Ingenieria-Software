"use strict";

import { AppDataSource } from "../config/configDb.js";
import { AnexoContratoProyectoSchema } from "../entities/anexo_contrato_proyecto.entity.js";
import { ContratoProyectoSchema } from "../entities/contrato_proyecto.entity.js";

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
 * cambio de monto, modificacion de condiciones).
 * Body: fecha_anexo, fecha_vigencia, motivo, descripcion_modificacion,
 *   monto_nuevo (opcional), observaciones (opcional)
 * Efecto secundario: actualiza fecha_extension del contrato a fecha_vigencia
 *   del anexo, ya que ese es el sentido de negocio del campo (fecha hasta la
 *   cual queda extendido/vigente el contrato tras el ultimo anexo).
 * Validaciones:
 * - El que hace la peticion debe tener tipo_usuario = administrador
 * - El contrato debe existir
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

    const {
      fecha_anexo,
      fecha_vigencia,
      motivo,
      descripcion_modificacion,
      monto_nuevo,
      observaciones,
    } = req.body;

    if (!fecha_anexo || !fecha_vigencia || !motivo || !descripcion_modificacion) {
      return res.status(400).json({
        message:
          "Los campos fecha_anexo, fecha_vigencia, motivo y descripcion_modificacion son obligatorios",
      });
    }

    if (monto_nuevo !== undefined && monto_nuevo !== null && isNaN(Number(monto_nuevo))) {
      return res.status(400).json({ message: "monto_nuevo debe ser numérico" });
    }

    const contrato = await contratoProyectoRepository.findOne({
      where: { id_contrato_proyecto: Number(id_contrato_proyecto) },
    });
    if (!contrato) {
      return res.status(404).json({ message: "Contrato de proyecto no encontrado" });
    }

    const nuevoAnexo = anexoRepository.create({
      id_contrato_proyecto: Number(id_contrato_proyecto),
      fecha_anexo,
      fecha_vigencia,
      motivo,
      descripcion_modificacion,
      monto_nuevo: monto_nuevo !== undefined && monto_nuevo !== null ? Number(monto_nuevo) : null,
      observaciones: observaciones || null,
    });

    await anexoRepository.save(nuevoAnexo);

    contrato.fecha_extension = fecha_vigencia;
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