"use strict";

import { AppDataSource } from "../config/configDb.js";
import { AnexoContratoSchema } from "../entities/anexo_contrato.entity.js";
import { crearNotificacion } from "../services/notificacion.service.js";

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
      es_anexo_termino, // true = este anexo cierra el contrato (pasa a Inactivo)
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

    // Un anexo de término OBLIGA a indicar la fecha real de cierre.
    if (es_anexo_termino && !fecha_termino_nueva) {
      return res.status(400).json({
        status: "error",
        message: "Para inactivar el contrato mediante un anexo de término debe indicar fecha_termino_nueva.",
      });
    }

    const contratoRepo = getContratoRepo();
    const contrato = await contratoRepo.findOne({
      where: { id_contrato: Number(id_contrato) },
    });
    if (!contrato) {
      return res.status(404).json({ status: "error", message: "Contrato no encontrado" });
    }

    if (contrato.estado_contrato === 'Inactivo') {
      return res.status(400).json({
        status: "error",
        message: "El contrato ya está Inactivo, no se pueden agregar más anexos.",
      });
    }

    const anexoRepo = getAnexoRepo();

    // Todo (guardar anexo + aplicar cambios al contrato) va en una sola
    // transacción: o se guarda todo, o no se guarda nada.
    const { anexoGuardado, contratoActualizado } = await AppDataSource.transaction(
      async (transactionalEntityManager) => {
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

        const anexoGuardado = await transactionalEntityManager.save(AnexoContratoSchema, nuevoAnexo);

        // Aplica al contrato los cambios que haya traído el anexo
        if (tipo_contrato_nuevo) {
          contrato.tipo_contrato = tipo_contrato_nuevo;
        }
        if (fecha_inicio_nueva) {
          contrato.fecha_inicio = fecha_inicio_nueva;
        }
        if (fecha_termino_nueva !== undefined) {
          contrato.fecha_termino = fecha_termino_nueva || null;
        }
        if (tipo_contrato_nuevo === 'Indefinido') {
          contrato.fecha_termino = null;
        }
        if (monto_nuevo !== undefined && monto_nuevo !== null && monto_nuevo !== '') {
          contrato.monto = Number(monto_nuevo);
        }

        // Efecto clave de este anexo: cierra el contrato.
        if (es_anexo_termino) {
          contrato.estado_contrato = 'Inactivo';
        }

        const contratoActualizado = await transactionalEntityManager.save("ContratoTrabajador", contrato);

        return { anexoGuardado, contratoActualizado };
      }
    );

    // Notificar al trabajador si el anexo cerró el contrato.
    if (es_anexo_termino) {
      try {
        await crearNotificacion({
          id_trabajador: contratoActualizado.id_trabajador,
          tipo: "contrato_inactivado",
          titulo: "Tu contrato ha finalizado",
          mensaje: `Tu contrato fue marcado como Inactivo, con término efectivo el ${fecha_termino_nueva}. Motivo: ${motivo}`,
          referencia_tipo: "contrato",
          referencia_id: contratoActualizado.id_contrato,
        });
      } catch (notifError) {
        console.error("Error al notificar cierre de contrato:", notifError);
      }
    }

    return res.status(201).json({
      status: "success",
      message: es_anexo_termino
        ? "Anexo de término creado. El contrato quedó Inactivo."
        : "Anexo creado correctamente",
      data: anexoGuardado,
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