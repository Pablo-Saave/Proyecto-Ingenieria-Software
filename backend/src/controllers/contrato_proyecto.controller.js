"use strict";

import { AppDataSource } from "../config/configDb.js";
import { ContratoProyectoSchema } from "../entities/contrato_proyecto.entity.js";
import { ProyectoSchema } from "../entities/proyecto.entity.js";
import {
  normalizarPaginacion,
  validarIdNumerico,
  validarCrearContratoProyecto,
  validarActualizarContratoProyecto,
  validarEliminarContratoProyecto,
  DIAS_UMBRAL_POR_VENCER,
} from "../validations/contrato_proyecto.validation.js";

function calcularEstadoPorFecha(fechaTermino) {
  const dias = Math.ceil((new Date(fechaTermino) - new Date()) / (1000 * 60 * 60 * 24));
  return dias <= DIAS_UMBRAL_POR_VENCER ? "por_vencer" : "activo";
}

const contratoProyectoRepository = AppDataSource.getRepository(ContratoProyectoSchema);
const proyectoRepository = AppDataSource.getRepository(ProyectoSchema);

function esAdministrador(req) {
  return req.user?.tipo_usuario === "administrador";
}

function rechazarSiNoAdmin(req, res) {
  if (esAdministrador(req)) return false;
  res.status(403).json({ message: "No tiene permisos para realizar esta accion" });
  return true;
}

export const getContratosProyecto = async (req, res) => {
  try {
    if (rechazarSiNoAdmin(req, res)) return;

    const { page, limit } = normalizarPaginacion(req.query);
    const { estado, search } = req.query;

    const query = contratoProyectoRepository
      .createQueryBuilder("contrato")
      .leftJoinAndSelect("contrato.proyecto", "proyecto")
      .leftJoinAndSelect("proyecto.cliente", "cliente");

    if (estado && estado !== "Todos") {
      query.andWhere("contrato.estado_contrato = :estado", { estado });
    }

    if (search) {
      query.andWhere(
        "(proyecto.nombre_proyecto ILIKE :search OR cliente.nombres ILIKE :search OR cliente.apellidos ILIKE :search)",
        { search: `%${search}%` }
      );
    }

    query.orderBy("contrato.fecha_inicio", "DESC");

    const total = await query.getCount();
    const contratos = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return res.status(200).json({
      data: contratos,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error en getContratosProyecto:", error);
    return res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};

export const getProyectosSinContrato = async (req, res) => {
  try {
    if (rechazarSiNoAdmin(req, res)) return;

    const proyectos = await proyectoRepository
      .createQueryBuilder("proyecto")
      .leftJoin("proyecto.contratoProyecto", "contrato")
      .leftJoinAndSelect("proyecto.cliente", "cliente")
      .where("contrato.id_contrato_proyecto IS NULL")
      .andWhere("proyecto.estado = :estado", { estado: "activo" })
      .orderBy("proyecto.nombre_proyecto", "ASC")
      .getMany();

    return res.status(200).json(proyectos);
  } catch (error) {
    console.error("Error en getProyectosSinContrato:", error);
    return res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};

export const getContratoProyectoDetalle = async (req, res) => {
  try {
    if (rechazarSiNoAdmin(req, res)) return;

    const { id } = req.params;
    const erroresId = validarIdNumerico(id);
    if (erroresId.length) {
      return res.status(400).json({ message: erroresId.join(" ") });
    }

    const contrato = await contratoProyectoRepository.findOne({
      where: { id_contrato_proyecto: Number(id) },
      relations: ["proyecto", "proyecto.cliente", "anexos"],
    });

    if (!contrato) {
      return res.status(404).json({ message: "Contrato de proyecto no encontrado" });
    }

    contrato.anexos = (contrato.anexos || []).sort(
      (a, b) => new Date(b.fecha_anexo) - new Date(a.fecha_anexo)
    );

    return res.status(200).json(contrato);
  } catch (error) {
    console.error("Error en getContratoProyectoDetalle:", error);
    return res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};

export const crearContratoProyecto = async (req, res) => {
  try {
    if (rechazarSiNoAdmin(req, res)) return;

    const errores = validarCrearContratoProyecto(req.body);
    if (errores.length) {
      return res.status(400).json({ message: errores.join(" ") });
    }

    const {
      id_proyecto,
      descripcion,
      fecha_inicio,
      fecha_termino,
      fecha_extension,
      monto,
    } = req.body;

    const proyecto = await proyectoRepository.findOne({
      where: { id_proyecto: Number(id_proyecto) },
    });
    if (!proyecto) {
      return res.status(404).json({ message: "Proyecto no encontrado" });
    }

    const contratoExistente = await contratoProyectoRepository.findOne({
      where: { id_proyecto: Number(id_proyecto) },
    });
    if (contratoExistente) {
      return res.status(409).json({ message: "Este proyecto ya tiene un contrato asociado" });
    }

    const nuevoContrato = contratoProyectoRepository.create({
      id_proyecto: Number(id_proyecto),
      descripcion,
      fecha_inicio,
      fecha_termino,
      fecha_extension: fecha_extension || fecha_termino,
      estado_contrato: calcularEstadoPorFecha(fecha_extension || fecha_termino),
      monto: Number(monto),
    });

    await contratoProyectoRepository.save(nuevoContrato);

    return res.status(201).json({
      message: "Contrato de proyecto creado correctamente",
      data: nuevoContrato,
    });
  } catch (error) {
    console.error("Error en crearContratoProyecto:", error);
    return res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};

export const actualizarContratoProyecto = async (req, res) => {
  try {
    if (rechazarSiNoAdmin(req, res)) return;

    const { id } = req.params;
    const erroresId = validarIdNumerico(id);
    if (erroresId.length) {
      return res.status(400).json({ message: erroresId.join(" ") });
    }

    const contrato = await contratoProyectoRepository.findOne({
      where: { id_contrato_proyecto: Number(id) },
    });
    if (!contrato) {
      return res.status(404).json({ message: "Contrato de proyecto no encontrado" });
    }

    const errores = validarActualizarContratoProyecto(contrato, req.body);
    if (errores.length) {
      return res.status(400).json({ message: errores.join(" ") });
    }

    if (req.body.descripcion !== undefined) {
      contrato.descripcion = req.body.descripcion;
    }

    await contratoProyectoRepository.save(contrato);

    return res.status(200).json({
      message: "Contrato de proyecto actualizado correctamente",
      data: contrato,
    });
  } catch (error) {
    console.error("Error en actualizarContratoProyecto:", error);
    return res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};

export const eliminarContratoProyecto = async (req, res) => {
  try {
    if (rechazarSiNoAdmin(req, res)) return;

    const { id } = req.params;
    const erroresId = validarIdNumerico(id);
    if (erroresId.length) {
      return res.status(400).json({ message: erroresId.join(" ") });
    }

    const contrato = await contratoProyectoRepository.findOne({
      where: { id_contrato_proyecto: Number(id) },
    });
    if (!contrato) {
      return res.status(404).json({ message: "Contrato de proyecto no encontrado" });
    }

    const errores = validarEliminarContratoProyecto(contrato);
    if (errores.length) {
      return res.status(400).json({ message: errores.join(" ") });
    }

    await AppDataSource.transaction(async (manager) => {
      await manager
        .createQueryBuilder()
        .delete()
        .from("AnexoContratoProyecto")
        .where("id_contrato_proyecto = :id", { id: Number(id) })
        .execute();

      await manager
        .createQueryBuilder()
        .delete()
        .from("ContratoProyecto")
        .where("id_contrato_proyecto = :id", { id: Number(id) })
        .execute();
    });

    return res.status(200).json({
      message: "Contrato de proyecto eliminado correctamente junto con sus anexos",
    });
  } catch (error) {
    console.error("Error en eliminarContratoProyecto:", error);
    return res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};