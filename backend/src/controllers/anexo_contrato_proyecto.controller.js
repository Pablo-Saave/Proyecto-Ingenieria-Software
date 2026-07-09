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

function hoyLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function calcularEstadoDesdeFechaTermino(fechaTermino) {
  const hoy = hoyLocal();
  if (!fechaTermino) return "activo";
  if (fechaTermino < hoy) return "inactivo";

  const limite = new Date();
  limite.setDate(limite.getDate() + DIAS_UMBRAL_POR_VENCER);
  const y = limite.getFullYear();
  const m = String(limite.getMonth() + 1).padStart(2, "0");
  const day = String(limite.getDate()).padStart(2, "0");
  const limiteStr = `${y}-${m}-${day}`;

  return fechaTermino <= limiteStr ? "por_vencer" : "activo";
}

export const getAnexosByContrato = async (req, res) => {
  try {
    if (!esAdministrador(req)) {
      return res.status(403).json({ message: "No tiene permisos para realizar esta accion" });
    }

    const { id_contrato_proyecto } = req.params;
    if (Number.isNaN(Number(id_contrato_proyecto))) {
      return res.status(400).json({ message: "id_contrato_proyecto debe ser numerico" });
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

export const crearAnexo = async (req, res) => {
  try {
    if (!esAdministrador(req)) {
      return res.status(403).json({ message: "No tiene permisos para realizar esta accion" });
    }

    const { id_contrato_proyecto } = req.params;
    if (Number.isNaN(Number(id_contrato_proyecto))) {
      return res.status(400).json({ message: "id_contrato_proyecto debe ser numerico" });
    }

    const errores = validarCrearAnexo(req.body);
    if (errores.length) {
      return res.status(400).json({ message: errores.join(" ") });
    }

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

    const {
      fecha_anexo,
      motivo,
      descripcion_modificacion,
      monto_nuevo,
      observaciones,
      fecha_termino_nueva,
      finaliza_contrato,
    } = req.body;

    const anexoGuardado = await AppDataSource.transaction(async (manager) => {
      const nuevoAnexo = manager.create(AnexoContratoProyectoSchema, {
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

      const guardado = await manager.save(AnexoContratoProyectoSchema, nuevoAnexo);

      if (fecha_termino_nueva) {
        contrato.fecha_extension = fecha_termino_nueva;
      }

      contrato.estado_contrato = finaliza_contrato === true
        ? "inactivo"
        : calcularEstadoDesdeFechaTermino(contrato.fecha_extension || contrato.fecha_termino);

      await manager.save(ContratoProyectoSchema, contrato);
      return guardado;
    });

    return res.status(201).json({
      message: "Anexo creado correctamente",
      data: anexoGuardado,
    });
  } catch (error) {
    console.error("Error en crearAnexo:", error);
    return res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};

export const eliminarAnexo = async (_req, res) => {
  return res.status(403).json({
    message:
      "Los anexos no se pueden eliminar: forman parte del historial del contrato. " +
      "Si hay un error, corrigelo creando un nuevo anexo.",
  });
};
