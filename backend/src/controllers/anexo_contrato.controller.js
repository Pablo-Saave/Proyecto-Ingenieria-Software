"use strict";

import { AppDataSource } from "../config/configDb.js";
import { AnexoContratoSchema } from "../entities/anexo_contrato.entity.js";

const TIPOS_CONTRATO = ['Indefinido', 'Plazo Fijo'];

function getAnexoRepo() {
  return AppDataSource.getRepository(AnexoContratoSchema);
}

function getContratoRepo() {
  return AppDataSource.getRepository("ContratoTrabajador");
}

function esAdministrador(req) {
  return req.user?.tipo_usuario === "administrador";
}

/***
 * Lista los anexos de un contrato laboral, del mas reciente al mas antiguo.
 */
export const getAnexosByContrato = async (req, res) => {
  try {
    if (!esAdministrador(req)) {
      return res.status(403).json({
        status: "error",
        message: "No tiene permisos para realizar esta acción",
      });
    }

    const { id_contrato } = req.params;
    if (isNaN(Number(id_contrato))) {
      return res.status(400).json({ status: "error", message: "id_contrato debe ser numérico" });
    }

    const contrato = await getContratoRepo().findOne({
      where: { id_contrato: Number(id_contrato) },
    });
    if (!contrato) {
      return res.status(404).json({ status: "error", message: "Contrato no encontrado" });
    }

    const anexos = await getAnexoRepo().find({
      where: { id_contrato: Number(id_contrato) },
      order: { fecha_anexo: "DESC" },
    });

    return res.status(200).json({ status: "success", data: anexos });
  } catch (error) {
    console.error("Error en getAnexosByContrato (laboral):", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
};

/***
 * Crea un anexo para un contrato laboral (renovacion, cambio de tipo,
 * extension de plazo, cambio de sueldo, etc).
 * Body: fecha_anexo, fecha_vigencia, motivo, descripcion_modificacion,
 *   tipo_contrato_nuevo (opcional), fecha_inicio_nueva (opcional),
 *   fecha_termino_nueva (opcional), monto_nuevo (opcional), observaciones (opcional)
 *
 * Efecto secundario: si viene alguno de tipo_contrato_nuevo / fecha_inicio_nueva /
 * fecha_termino_nueva / monto_nuevo, actualiza el contrato con esos valores
 * (es el mecanismo real para modificar esos campos, ya que la edición directa
 * del contrato los bloquea).
 */
export const crearAnexo = async (req, res) => {
  try {
    if (!esAdministrador(req)) {
      return res.status(403).json({
        status: "error",
        message: "No tiene permisos para realizar esta acción",
      });
    }

    const { id_contrato } = req.params;
    if (isNaN(Number(id_contrato))) {
      return res.status(400).json({ status: "error", message: "id_contrato debe ser numérico" });
    }

    const {
      fecha_anexo,
      fecha_vigencia,
      motivo,
      descripcion_modificacion,
      tipo_contrato_nuevo,
      fecha_inicio_nueva,
      fecha_termino_nueva,
      monto_nuevo,
      observaciones,
    } = req.body;

    if (!fecha_anexo || !fecha_vigencia || !motivo || !descripcion_modificacion) {
      return res.status(400).json({
        status: "error",
        message:
          "Los campos fecha_anexo, fecha_vigencia, motivo y descripcion_modificacion son obligatorios",
      });
    }

    if (tipo_contrato_nuevo !== undefined && tipo_contrato_nuevo !== null && !TIPOS_CONTRATO.includes(tipo_contrato_nuevo)) {
      return res.status(400).json({
        status: "error",
        message: `tipo_contrato_nuevo inválido. Valores permitidos: ${TIPOS_CONTRATO.join(", ")}.`,
      });
    }

    if (monto_nuevo !== undefined && monto_nuevo !== null && monto_nuevo !== '' && isNaN(Number(monto_nuevo))) {
      return res.status(400).json({ status: "error", message: "monto_nuevo debe ser numérico" });
    }

    if (tipo_contrato_nuevo === 'Plazo Fijo' && !fecha_termino_nueva) {
      return res.status(400).json({
        status: "error",
        message: "Si cambia el tipo a Plazo Fijo debe indicar fecha_termino_nueva.",
      });
    }

    if (tipo_contrato_nuevo === 'Indefinido' && fecha_termino_nueva) {
      return res.status(400).json({
        status: "error",
        message: "Un contrato Indefinido no puede tener fecha_termino_nueva.",
      });
    }

    const contratoRepo = getContratoRepo();
    const contrato = await contratoRepo.findOne({
      where: { id_contrato: Number(id_contrato) },
    });
    if (!contrato) {
      return res.status(404).json({ status: "error", message: "Contrato no encontrado" });
    }

    const anexoRepo = getAnexoRepo();
    const nuevoAnexo = anexoRepo.create({
      id_contrato: Number(id_contrato),
      fecha_anexo,
      fecha_vigencia,
      motivo,
      descripcion_modificacion,
      tipo_contrato_nuevo: tipo_contrato_nuevo || null,
      fecha_inicio_nueva: fecha_inicio_nueva || null,
      fecha_termino_nueva: fecha_termino_nueva || null,
      monto_nuevo: monto_nuevo !== undefined && monto_nuevo !== null && monto_nuevo !== '' ? Number(monto_nuevo) : null,
      observaciones: observaciones || null,
    });

    await anexoRepo.save(nuevoAnexo);

    // Aplica al contrato los cambios que haya traído el anexo
    let huboCambios = false;
    if (tipo_contrato_nuevo) {
      contrato.tipo_contrato = tipo_contrato_nuevo;
      huboCambios = true;
    }
    if (fecha_inicio_nueva) {
      contrato.fecha_inicio = fecha_inicio_nueva;
      huboCambios = true;
    }
    if (fecha_termino_nueva !== undefined) {
      contrato.fecha_termino = fecha_termino_nueva || null;
      huboCambios = true;
    }
    if (tipo_contrato_nuevo === 'Indefinido') {
      contrato.fecha_termino = null;
      huboCambios = true;
    }
    if (monto_nuevo !== undefined && monto_nuevo !== null && monto_nuevo !== '') {
      contrato.monto = Number(monto_nuevo);
      huboCambios = true;
    }

    if (huboCambios) {
      await contratoRepo.save(contrato);
    }

    return res.status(201).json({
      status: "success",
      message: "Anexo creado correctamente",
      data: nuevoAnexo,
    });
  } catch (error) {
    console.error("Error en crearAnexo (laboral):", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
};

/***
 * Elimina un anexo de contrato laboral.
 * NOTA: al igual que en el modulo de proyectos, esto NO revierte los cambios
 * que el anexo aplico al contrato (tipo/fechas/monto quedan como estan).
 */
export const eliminarAnexo = async (req, res) => {
  try {
    if (!esAdministrador(req)) {
      return res.status(403).json({
        status: "error",
        message: "No tiene permisos para realizar esta acción",
      });
    }

    const { id_anexo } = req.params;
    if (isNaN(Number(id_anexo))) {
      return res.status(400).json({ status: "error", message: "id_anexo debe ser numérico" });
    }

    const anexoRepo = getAnexoRepo();
    const anexo = await anexoRepo.findOne({
      where: { id_anexo_contrato: Number(id_anexo) },
    });
    if (!anexo) {
      return res.status(404).json({ status: "error", message: "Anexo no encontrado" });
    }

    await anexoRepo.remove(anexo);

    return res.status(200).json({ status: "success", message: "Anexo eliminado correctamente" });
  } catch (error) {
    console.error("Error en eliminarAnexo (laboral):", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
};