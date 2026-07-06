"use strict";

import { AppDataSource } from "../config/configDb.js";
import { ContratoProyectoSchema } from "../entities/contrato_proyecto.entity.js";
import { ProyectoSchema } from "../entities/proyecto.entity.js";
import {
  validarCrearContratoProyecto,
  validarActualizarContratoProyecto,
  validarEliminarContratoProyecto,
} from "../validations/contrato_proyecto.validation.js";

const contratoProyectoRepository = AppDataSource.getRepository(ContratoProyectoSchema);
const proyectoRepository = AppDataSource.getRepository(ProyectoSchema);

function esAdministrador(req) {
  return req.user?.tipo_usuario === "administrador";
}

/***
 * Obtiene una lista paginada de contratos de proyecto.
 * Incluye info basica del proyecto asociado (y su cliente).
 * Query params:
 * - page, limit
 * - estado: filtra por estado_contrato
 * - search: busca por nombre_proyecto
 * Validaciones:
 * - El que hace la peticion debe tener tipo_usuario = administrador
 */
export const getContratosProyecto = async (req, res) => {
  try {
    if (!esAdministrador(req)) {
      return res.status(403).json({
        message: "No tiene permisos para realizar esta acción",
      });
    }

    let { page = 1, limit = 10, estado, search } = req.query;
    page = Number(page);
    limit = Number(limit);
    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 10;

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

/***
 * Lista proyectos activos que todavia NO tienen un contrato asociado.
 * Pensado para poblar el selector del modal "Nuevo Contrato" en el frontend
 * (evita que el admin intente crear un contrato para un proyecto que ya
 * tiene uno, ya que la relacion es 1 a 1).
 * Validaciones:
 * - El que hace la peticion debe tener tipo_usuario = administrador
 */
export const getProyectosSinContrato = async (req, res) => {
  try {
    if (!esAdministrador(req)) {
      return res.status(403).json({
        message: "No tiene permisos para realizar esta acción",
      });
    }

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

/***
 * Obtiene el detalle de un contrato de proyecto, incluyendo sus anexos
 * (ordenados del mas reciente al mas antiguo).
 * Validaciones:
 * - El que hace la peticion debe tener tipo_usuario = administrador
 */
export const getContratoProyectoDetalle = async (req, res) => {
  try {
    if (!esAdministrador(req)) {
      return res.status(403).json({
        message: "No tiene permisos para realizar esta acción",
      });
    }

    const { id } = req.params;
    if (isNaN(Number(id))) {
      return res.status(400).json({ message: "id debe ser numérico" });
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

/***
 * Crea el contrato para un proyecto.
 * Relacion es 1 a 1 (id_proyecto es unique), por lo que un proyecto
 * solo puede tener un contrato activo asociado.
 * Body: id_proyecto, descripcion, fecha_inicio, fecha_termino, estado_contrato
 *   fecha_extension es opcional: si no se envia, se inicializa igual a
 *   fecha_termino (el campo es nullable:false en la entidad, y recien
 *   tiene sentido real una vez que existe un anexo que extienda el contrato).
 * Validaciones (ver contrato_proyecto.validation.js):
 * - El que crea el contrato debe tener tipo_usuario = administrador
 * - El proyecto debe existir
 * - El proyecto no debe tener ya un contrato asociado
 * - Los campos obligatorios no deben estar vacios
 * - fecha_termino debe ser posterior a fecha_inicio
 */
export const crearContratoProyecto = async (req, res) => {
  try {
    if (!esAdministrador(req)) {
      return res.status(403).json({
        message: "No tiene permisos para realizar esta acción",
      });
    }

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
      estado_contrato,
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
      return res.status(409).json({
        message: "Este proyecto ya tiene un contrato asociado",
      });
    }

    const nuevoContrato = contratoProyectoRepository.create({
      id_proyecto: Number(id_proyecto),
      descripcion,
      fecha_inicio,
      fecha_termino,
      fecha_extension: fecha_extension || fecha_termino,
      estado_contrato,
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

/***
 * Actualiza un contrato de proyecto existente.
 * SOLO permite modificar descripcion: fecha_inicio, fecha_termino, monto
 * y estado_contrato quedan bloqueados para la edición directa (deben
 * cambiarse creando un anexo, igual que en ContratoTrabajador). En
 * particular, inactivar un contrato (o reactivarlo) SIEMPRE debe hacerse
 * a través de un anexo, nunca editando el campo directamente. Si el
 * frontend reenvía esos campos con el mismo valor que ya tenían, se
 * ignoran silenciosamente; si intenta cambiarlos de verdad, se rechaza.
 * Validaciones (ver contrato_proyecto.validation.js):
 * - El que hace la peticion debe tener tipo_usuario = administrador
 * - El contrato debe existir
 * - La peticion debe contener al menos un campo a actualizar (descripcion)
 */
export const actualizarContratoProyecto = async (req, res) => {
  try {
    if (!esAdministrador(req)) {
      return res.status(403).json({
        message: "No tiene permisos para realizar esta acción",
      });
    }

    const { id } = req.params;
    if (isNaN(Number(id))) {
      return res.status(400).json({ message: "id debe ser numérico" });
    }

    const contrato = await contratoProyectoRepository.findOne({
      where: { id_contrato_proyecto: Number(id) },
    });
    if (!contrato) {
      return res.status(404).json({ message: "Contrato de proyecto no encontrado" });
    }

    // validarActualizarContratoProyecto muta req.body: elimina campos
    // bloqueados que llegaron sin cambio real de valor.
    const errores = validarActualizarContratoProyecto(contrato, req.body);
    if (errores.length) {
      return res.status(400).json({ message: errores.join(" ") });
    }

    const { descripcion } = req.body;
    if (descripcion !== undefined) contrato.descripcion = descripcion;

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

/***
 * Elimina un contrato de proyecto junto con todos sus anexos (cascada manual
 * via transaccion, ya que EntitySchema no define onDelete: "CASCADE").
 * Validaciones (ver contrato_proyecto.validation.js):
 * - El que hace la peticion debe tener tipo_usuario = administrador
 * - El contrato debe existir
 * - El contrato debe estar en estado "inactivo" (si no, se debe crear un
 *   anexo que lo finalice antes de poder eliminarlo)
 */
export const eliminarContratoProyecto = async (req, res) => {
  const queryRunner = AppDataSource.createQueryRunner();

  try {
    if (!esAdministrador(req)) {
      return res.status(403).json({
        message: "No tiene permisos para realizar esta acción",
      });
    }

    const { id } = req.params;
    if (isNaN(Number(id))) {
      return res.status(400).json({ message: "id debe ser numérico" });
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

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager
        .createQueryBuilder()
        .delete()
        .from("AnexoContratoProyecto")
        .where("id_contrato_proyecto = :id", { id: Number(id) })
        .execute();

      await queryRunner.manager
        .createQueryBuilder()
        .delete()
        .from("ContratoProyecto")
        .where("id_contrato_proyecto = :id", { id: Number(id) })
        .execute();

      await queryRunner.commitTransaction();
    } catch (innerError) {
      await queryRunner.rollbackTransaction();
      throw innerError;
    } finally {
      await queryRunner.release();
    }

    return res.status(200).json({
      message: "Contrato de proyecto eliminado correctamente junto con sus anexos",
    });
  } catch (error) {
    console.error("Error en eliminarContratoProyecto:", error);
    return res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};