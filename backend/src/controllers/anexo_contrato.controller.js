"use strict";

import { AppDataSource } from "../config/configDb.js";
import { AnexoContratoSchema } from "../entities/anexo_contrato.entity.js";
import { crearNotificacion } from "../services/notificacion.service.js";
import {
  DIAS_UMBRAL_POR_VENCER,
  validarBodyAnexoContrato,
} from "../validations/contratos.validation.js";

function hoyLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function calcularEstadoDesdeFechaTermino(fechaTermino) {
  const hoy = hoyLocal();
  if (!fechaTermino) return "Activo";
  if (fechaTermino < hoy) return "Inactivo";

  const limite = new Date();
  limite.setDate(limite.getDate() + DIAS_UMBRAL_POR_VENCER);
  const y = limite.getFullYear();
  const m = String(limite.getMonth() + 1).padStart(2, "0");
  const day = String(limite.getDate()).padStart(2, "0");
  const limiteStr = `${y}-${m}-${day}`;

  return fechaTermino <= limiteStr ? "Por vencer" : "Activo";
}

function getAnexoRepo() {
  return AppDataSource.getRepository(AnexoContratoSchema);
}

function getContratoRepo() {
  return AppDataSource.getRepository("ContratoTrabajador");
}

function esAdministrador(req) {
  return req.user?.tipo_usuario === "administrador";
}

export const getAnexosByContrato = async (req, res) => {
  try {
    if (!esAdministrador(req)) {
      return res.status(403).json({
        status: "error",
        message: "No tiene permisos para realizar esta accion",
      });
    }

    const { id_contrato } = req.params;
    if (Number.isNaN(Number(id_contrato))) {
      return res.status(400).json({ status: "error", message: "id_contrato debe ser numerico" });
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

export const crearAnexo = async (req, res) => {
  try {
    if (!esAdministrador(req)) {
      return res.status(403).json({
        status: "error",
        message: "No tiene permisos para realizar esta accion",
      });
    }

    const { id_contrato } = req.params;
    if (Number.isNaN(Number(id_contrato))) {
      return res.status(400).json({ status: "error", message: "id_contrato debe ser numerico" });
    }

    const erroresBody = validarBodyAnexoContrato(req.body);
    if (erroresBody.length) {
      return res.status(400).json({
        status: "error",
        message: erroresBody.join(" "),
      });
    }

    const {
      fecha_anexo,
      motivo,
      descripcion_modificacion,
      tipo_contrato_nuevo,
      fecha_inicio_nueva,
      fecha_termino_nueva,
      monto_nuevo,
      observaciones,
      es_anexo_termino,
    } = req.body;

    const contratoRepo = getContratoRepo();
    const contrato = await contratoRepo.findOne({
      where: { id_contrato: Number(id_contrato) },
    });
    if (!contrato) {
      return res.status(404).json({ status: "error", message: "Contrato no encontrado" });
    }

    if (contrato.estado_contrato === "Inactivo") {
      return res.status(400).json({
        status: "error",
        message: "El contrato ya esta Inactivo, no se pueden agregar mas anexos.",
      });
    }

    const anexoRepo = getAnexoRepo();

    const { anexoGuardado, contratoActualizado } = await AppDataSource.transaction(
      async (transactionalEntityManager) => {
        const nuevoAnexo = anexoRepo.create({
          id_contrato: Number(id_contrato),
          fecha_anexo,
          motivo,
          descripcion_modificacion,
          tipo_contrato_nuevo: tipo_contrato_nuevo || null,
          fecha_inicio_nueva: fecha_inicio_nueva || null,
          fecha_termino_nueva: fecha_termino_nueva || null,
          monto_nuevo: monto_nuevo !== undefined && monto_nuevo !== null && monto_nuevo !== ""
            ? Number(monto_nuevo)
            : null,
          observaciones: observaciones || null,
        });

        const anexoGuardado = await transactionalEntityManager.save(AnexoContratoSchema, nuevoAnexo);

        if (tipo_contrato_nuevo) contrato.tipo_contrato = tipo_contrato_nuevo;
        if (fecha_inicio_nueva) contrato.fecha_inicio = fecha_inicio_nueva;
        if (fecha_termino_nueva !== undefined) contrato.fecha_termino = fecha_termino_nueva || null;
        if (tipo_contrato_nuevo === "Indefinido") contrato.fecha_termino = null;

        if (contrato.fecha_termino && contrato.tipo_contrato === "Indefinido") {
          contrato.tipo_contrato = "Plazo Fijo";
        }

        if (monto_nuevo !== undefined && monto_nuevo !== null && monto_nuevo !== "") {
          contrato.monto = Number(monto_nuevo);
        }

        contrato.estado_contrato = es_anexo_termino
          ? "Inactivo"
          : calcularEstadoDesdeFechaTermino(contrato.fecha_termino);

        const contratoActualizado = await transactionalEntityManager.save("ContratoTrabajador", contrato);

        return { anexoGuardado, contratoActualizado };
      }
    );

    if (es_anexo_termino) {
      try {
        await crearNotificacion({
          id_trabajador: contratoActualizado.id_trabajador,
          tipo: "contrato_inactivado",
          titulo: "Tu contrato ha finalizado",
          mensaje: `Tu contrato fue marcado como Inactivo, con termino efectivo el ${fecha_termino_nueva}. Motivo: ${motivo}`,
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
        ? "Anexo de termino creado. El contrato quedo Inactivo."
        : "Anexo creado correctamente",
      data: anexoGuardado,
    });
  } catch (error) {
    console.error("Error en crearAnexo (laboral):", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
};

export const eliminarAnexo = async (_req, res) => {
  return res.status(403).json({
    status: "error",
    message:
      "Los anexos no se pueden eliminar: forman parte del historial del contrato. " +
      "Si hay un error, corrigelo creando un nuevo anexo.",
  });
};
