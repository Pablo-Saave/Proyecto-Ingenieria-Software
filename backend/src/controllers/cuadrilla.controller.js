"use strict";

import { AppDataSource } from "../config/configDb.js"; // ajusta el path según tu proyecto
import { ProyectoSchema }  from "../entities/proyecto.entity.js";
import { CuadrillaSchema } from "../entities/cuadrilla.entity.js";
import { AsignadoSchema }  from "../entities/asignado.entity.js";

import { In } from "typeorm";

const proyectoRepository = AppDataSource.getRepository("Proyecto");
const trabajadorRepository = AppDataSource.getRepository("Trabajador");
const cuadrillaRepository = AppDataSource.getRepository("Cuadrilla");
const asignadoRepository = AppDataSource.getRepository("Asignado");
const avisoRepository = AppDataSource.getRepository("Aviso");


/***
 * Crea una cuadrilla
 * Recibe:
 * - id_proyecto: proyecto a la cual se le creara una cuadrilla
 * - nombre_cuadrilla: nombre de la cuadrilla
 * - estado (opcional): estado inicial de la cuadrilla
 * Validaciones:
 * - El que crea la cuadrilla debe tener tipo_usuario = administrador
 * - El proyecto al cual pertenece la cuadrilla debe tener estado = activo
 * - id_proyecto debe existir
 * - Los campos no pueden estar vacios
 */
export const crearCuadrilla = async (req, res) => {
  try {
    const { id_proyecto, nombre_cuadrilla, estado } = req.body;
    const { tipo_usuario: tipo_solicitante } = req.user;

    // Validar que los campos obligatorios no estén vacíos
    // (estado ya no es obligatorio: el schema le aplica default "activa")
    if (!id_proyecto || !nombre_cuadrilla) {
      return res.status(400).json({
        message: "Los campos id_proyecto y nombre_cuadrilla son obligatorios",
      });
    }

    if (isNaN(Number(id_proyecto))) {
      return res.status(400).json({
        message: "id_proyecto debe ser numérico",
      });
    }

    // 1. Validar que quien realiza la petición sea administrador
    if (tipo_solicitante !== "administrador") {
      return res.status(403).json({
        message: "No tiene permisos para realizar esta acción",
      });
    }

    // 3. Validar que el proyecto exista
    const proyecto = await proyectoRepository.findOne({
      where: { id_proyecto: Number(id_proyecto) },
    });
    if (!proyecto) {
      return res.status(404).json({ message: "Proyecto no encontrado" });
    }

    // Validar que el proyecto esté activo
    if (proyecto.estado !== "activo") {
      return res.status(409).json({
        message: "No se puede crear la cuadrilla porque el proyecto no está activo",
      });
    }

    // Crear la cuadrilla (si no se envía "estado", el schema aplica default "activa")
    const nuevaCuadrilla = cuadrillaRepository.create({
      id_proyecto: Number(id_proyecto),
      nombre_cuadrilla,
      ...(estado !== undefined && { estado }),
      fecha_creacion: new Date(),
    });

    await cuadrillaRepository.save(nuevaCuadrilla);

    return res.status(201).json({
      message: "Cuadrilla creada correctamente",
      data: nuevaCuadrilla,
    });
  } catch (error) {
    console.error("Error en crearCuadrilla:", error);
    return res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};

// eliminar cuadrilla

export async function deleteCuadrilla(req, res) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const cuadrilla = await cuadrillaRepository.findOneBy({ id_cuadrilla: id });

    if (!cuadrilla) {
      return res.status(404).json({
        status: "error",
        message: "Cuadrilla no encontrada",
      });
    }

    // eliminar relaciones primero
    await asignadoRepository.delete({ id_cuadrilla: id });

    //eliminar avisos primero
    await avisoRepository.delete({id_cuadrilla: id});

    // eliminar cuadrilla
    await cuadrillaRepository.delete({ id_cuadrilla: id });

    return res.status(200).json({
      status: "success",
      message: "Cuadrilla eliminada correctamente",
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "error",
      message: "Error interno del servidor",
    });
  }
};

/***
 * Soft Delete - Cambia el estado de una cuadrilla a "inactiva"
 * Validaciones
 * - El que realiza la peticion debe tener tipo_usuario = administrador
 * - La cuadrilla debe existir
 * - El proyecto al cual pertenece la cuadrilla debe tener estado = activo
 * - La cuadrilla no debe estar inactiva
 */
export const inactivarCuadrilla = async (req, res) => {
  try {
    const { id_cuadrilla } = req.body;
    const { tipo_usuario: tipo_solicitante } = req.user;

    if (!id_cuadrilla) {
      return res.status(400).json({
        message: "El campo id_cuadrilla es obligatorio",
      });
    }

    if (isNaN(Number(id_cuadrilla))) {
      return res.status(400).json({
        message: "id_cuadrilla debe ser numérico",
      });
    }

    // 1. Validar que quien realiza la petición sea administrador
    if (tipo_solicitante !== "administrador") {
      return res.status(403).json({
        message: "No tiene permisos para realizar esta acción",
      });
    }

    // 2. Validar que la cuadrilla exista (con su proyecto, para validar estado)
    const cuadrilla = await cuadrillaRepository.findOne({
      where: { id_cuadrilla: Number(id_cuadrilla) },
      relations: ["proyecto"],
    });
    if (!cuadrilla) {
      return res.status(404).json({ message: "Cuadrilla no encontrada" });
    }

    // Validar que el proyecto al cual pertenece la cuadrilla esté activo
    if (cuadrilla.proyecto.estado !== "activo") {
      return res.status(409).json({
        message: "No se puede inactivar la cuadrilla porque su proyecto no está activo",
      });
    }

    // Validar que la cuadrilla no esté ya inactiva
    if (cuadrilla.estado === "inactiva") {
      return res.status(409).json({
        message: "La cuadrilla ya se encuentra inactiva",
      });
    }

    // Cambiar estado a "inactiva"
    cuadrilla.estado = "inactiva";
    await cuadrillaRepository.save(cuadrilla);

    return res.status(200).json({
      message: "Cuadrilla inactivada correctamente",
      data: cuadrilla,
    });
  } catch (error) {
    console.error("Error en inactivarCuadrilla:", error);
    return res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};


/***
 * Reactiva una Cuadrilla
 * Cambia el estado de una cuadrilla a "activa"
 * Validaciones:
 * - El que realiza la peticion debe tener tipo_usuario = administrador
 * - La cuadrilla debe existir
 * - El proyecto del cual la cuadrilla pertenece debe estar activo
 * - La cuadrilla no debe esar ya "activa"
 */
export const reactivarCuadrilla = async (req, res) => {
  try {
    const { id_cuadrilla } = req.body;
    const { tipo_usuario: tipo_solicitante } = req.user;

    if (isNaN(Number(id_cuadrilla))) {
      return res.status(400).json({
        message: "id_cuadrilla debe ser numérico",
      });
    }

    // 1. Validar que quien realiza la petición sea administrador
    if (tipo_solicitante !== "administrador") {
      return res.status(403).json({
        message: "No tiene permisos para realizar esta acción",
      });
    }

    // 2. Validar que la cuadrilla exista (con su proyecto, para validar estado)
    const cuadrilla = await cuadrillaRepository.findOne({
      where: { id_cuadrilla: Number(id_cuadrilla) },
      relations: ["proyecto"],
    });
    if (!cuadrilla) {
      return res.status(404).json({ message: "Cuadrilla no encontrada" });
    }

    // 3. Validar que el proyecto al que pertenece la cuadrilla esté activo
    if (cuadrilla.proyecto.estado !== "activo") {
      return res.status(409).json({
        message: "No se puede reactivar la cuadrilla porque su proyecto no está activo",
      });
    }

    // 4. Validar que la cuadrilla no esté ya activa
    if (cuadrilla.estado === "activa") {
      return res.status(409).json({
        message: "La cuadrilla ya se encuentra activa",
      });
    }

    // Reactivar la cuadrilla
    cuadrilla.estado = "activa";
    await cuadrillaRepository.save(cuadrilla);

    return res.status(200).json({
      message: "Cuadrilla reactivada correctamente",
      data: cuadrilla,
    });
  } catch (error) {
    console.error("Error en reactivarCuadrilla:", error);
    return res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};

/***
 * Cambia el nombre de una cuadrilla
 * Validaciones:
 * - El que realiza la peticion debe tener tipo_usuario = administrador
 * - La cuadrilla debe existir
 * - El proyecto del cual la cuadrilla pertenece debe estar activo
 * - La cuadrilla a editar debe estar "activa"
 */
export const editarNombreCuadrilla = async (req, res) => {
  try {
    const { id_cuadrilla, nombre_cuadrilla } = req.body;
    const { tipo_usuario: tipo_solicitante } = req.user;

    if (!id_cuadrilla || !nombre_cuadrilla) {
      return res.status(400).json({
        message: "Los campos id_cuadrilla y nombre_cuadrilla son obligatorios",
      });
    }

    if (isNaN(Number(id_cuadrilla))) {
      return res.status(400).json({
        message: "id_cuadrilla debe ser numérico",
      });
    }

    // 1. Validar que quien realiza la petición sea administrador
    if (tipo_solicitante !== "administrador") {
      return res.status(403).json({
        message: "No tiene permisos para realizar esta acción",
      });
    }

    // 2. Validar que la cuadrilla exista (con su proyecto, para validar estado)
    const cuadrilla = await cuadrillaRepository.findOne({
      where: { id_cuadrilla: Number(id_cuadrilla) },
      relations: ["proyecto"],
    });
    if (!cuadrilla) {
      return res.status(404).json({ message: "Cuadrilla no encontrada" });
    }

    // 3. Validar que el proyecto al que pertenece la cuadrilla esté activo
    if (cuadrilla.proyecto.estado !== "activo") {
      return res.status(409).json({
        message: "No se puede editar la cuadrilla porque su proyecto no está activo",
      });
    }

    // 4. Validar que la cuadrilla esté activa
    if (cuadrilla.estado !== "activa") {
      return res.status(409).json({
        message: "No se puede editar la cuadrilla porque no está activa",
      });
    }

    // Editar el nombre
    cuadrilla.nombre_cuadrilla = nombre_cuadrilla;
    await cuadrillaRepository.save(cuadrilla);

    return res.status(200).json({
      message: "Nombre de cuadrilla actualizado correctamente",
      data: cuadrilla,
    });
  } catch (error) {
    console.error("Error en editarNombreCuadrilla:", error);
    return res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};


/***
 * Obtiene una lista paginada de las cuadrillas de un proyecto, en base a su id_proyecto.
 * Cada cuadrilla incluye una lista de sus integrantes con la forma:
 * { id_trabajador, nombres, apellidos, cargo_operativo, tipo_jornada, fecha_asignacion }
 * Validaciones
 * - El usuario que realiza la consulta debe tener tipo_usuario = administrador
 * - El proyecto debe existir
 * - El proyecto debe tener estado = "activo"
 * Query params:
 * - page, limit: paginación
 * - orden: "alfabetico" para ordenar por nombre_cuadrilla, por defecto ordena por fecha_creacion
 */
export const getAllCuadrillasAndWorkersByIdProyecto = async (req, res) => {
  try {
    const { id_proyecto } = req.params;
    const { tipo_usuario } = req.user; // viene del authMiddleware

    if (isNaN(Number(id_proyecto))) {
      return res.status(400).json({
        message: "id_proyecto debe ser numérico",
      });
    }

    // Validacion 1: administrador
    if (tipo_usuario !== "administrador") {
      return res.status(403).json({
        message: "No tiene permisos para realizar esta acción",
      });
    }

    // Validacion 2: el proyecto debe existir
    const proyecto = await proyectoRepository.findOne({
      where: { id_proyecto: Number(id_proyecto) },
    });
    if (!proyecto) {
      return res.status(404).json({ message: "Proyecto no encontrado" });
    }

    let { page = 1, limit = 10, orden } = req.query;

    page = Number(page);
    limit = Number(limit);

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 10;

    // Orden: por defecto fecha_creacion, opcionalmente alfabético por nombre_cuadrilla
    let orderBy = { fecha_creacion: "DESC" };
    if (orden === "alfabetico") {
      orderBy = { nombre_cuadrilla: "ASC" };
    }

    const [cuadrillas, total] = await cuadrillaRepository.findAndCount({
      where: { id_proyecto: Number(id_proyecto) },
      order: orderBy,
      skip: (page - 1) * limit,
      take: limit,
    });

    const idsCuadrillas = cuadrillas.map((c) => c.id_cuadrilla);

    // Obtener los integrantes de todas las cuadrillas de la página actual
    // en una sola consulta, para luego agruparlos por id_cuadrilla en memoria
    // (evita hacer N queries, una por cada cuadrilla).
    let integrantesRaw = [];
    if (idsCuadrillas.length > 0) {
      integrantesRaw = await asignadoRepository
        .createQueryBuilder("asignado")
        .innerJoin("asignado.trabajador", "trabajador")
        .where("asignado.id_cuadrilla IN (:...idsCuadrillas)", { idsCuadrillas })
        .select([
          "asignado.id_cuadrilla AS id_cuadrilla",
          "trabajador.id_trabajador AS id_trabajador",
          "trabajador.nombres AS nombres",
          "trabajador.apellidos AS apellidos",
          "trabajador.rut AS rut",
          "asignado.cargo_operativo AS cargo_operativo",
          "asignado.tipo_jornada AS tipo_jornada",
          "asignado.fecha_asignacion AS fecha_asignacion",
        ])
        .getRawMany();
    }

    // Agrupar integrantes por id_cuadrilla
    const integrantesPorCuadrilla = {};
    for (const integrante of integrantesRaw) {
      const { id_cuadrilla, ...datosIntegrante } = integrante;
      if (!integrantesPorCuadrilla[id_cuadrilla]) {
        integrantesPorCuadrilla[id_cuadrilla] = [];
      }
      integrantesPorCuadrilla[id_cuadrilla].push(datosIntegrante);
    }

    // Adjuntar la lista de integrantes a cada cuadrilla
    const cuadrillasConIntegrantes = cuadrillas.map((cuadrilla) => ({
      ...cuadrilla,
      integrantes: integrantesPorCuadrilla[cuadrilla.id_cuadrilla] || [],
    }));

    return res.status(200).json({
      data: cuadrillasConIntegrantes,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error al obtener las cuadrillas del proyecto:", error);
    return res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};

/***
 * Obtiene la cuadrilla activa a la que pertenece el trabajador autenticado.
 * Uso: el propio trabajador necesita su id_cuadrilla para crear una ausencia propia.
 * Validaciones:
 * - El solicitante debe estar asignado a al menos una cuadrilla (tabla Asignado)
 */
export const getMiCuadrilla = async (req, res) => {
  try {
    const { id_trabajador } = req.user;

    const asignado = await asignadoRepository.findOne({
      where: { id_trabajador },
      relations: ["cuadrilla"],
      order: { fecha_asignacion: "DESC" },
    });

    if (!asignado) {
      return res.status(404).json({
        message: "No estás asignado a ninguna cuadrilla actualmente",
      });
    }

    return res.status(200).json({
      data: {
        id_cuadrilla: asignado.cuadrilla.id_cuadrilla,
        nombre_cuadrilla: asignado.cuadrilla.nombre_cuadrilla,
      },
    });
  } catch (error) {
    console.error("Error en getMiCuadrilla:", error);
    return res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};


/***
 * Agrega un id_trabajador a una id_cuadrilla
 * Validaciones:
 * - El que realiza la peticion post debe tener tipo_usuario = administrador)
 * - El id_trabajador a agregar no puede tener tipo_usuario = supervisor o tipo_usuario = administrador
 * - El trabajador a agregar no puede existir ya en la cuadrilla
 * - El proyecto debe tener estado "activo"
 * - La cuadrilla debe tener estado "activa"
 * - Todos los campos deben tener datos (id_cuadrilla, id_trabajador, cargo_operativo y tipo_jornada)
 */
export const agregarTrabajadorCuadrilla = async (req, res) => {
  try {
    const { id_cuadrilla, id_trabajador, cargo_operativo, tipo_jornada } = req.body;
    const { id_trabajador: id_solicitante, tipo_usuario: tipo_solicitante } = req.user;

    // Validar que todos los campos tengan datos
    if (!id_cuadrilla || !id_trabajador || !cargo_operativo || !tipo_jornada) {
      return res.status(400).json({
        message:
          "Los campos id_cuadrilla, id_trabajador, cargo_operativo y tipo_jornada son obligatorios",
      });
    }

    if (isNaN(Number(id_cuadrilla)) || isNaN(Number(id_trabajador))) {
      return res.status(400).json({
        message: "id_cuadrilla e id_trabajador deben ser numéricos",
      });
    }

    // 0. Validar que la cuadrilla exista (con su proyecto, necesaria antes de
    const cuadrilla = await cuadrillaRepository.findOne({
      where: { id_cuadrilla: Number(id_cuadrilla) },
      relations: ["proyecto"],
    });
    if (!cuadrilla) {
      return res.status(404).json({ message: "Cuadrilla no encontrada" });
    }

    // Validar que el proyecto esté activo
    if (cuadrilla.proyecto.estado !== "activo") {
      return res.status(409).json({
        message: "No se puede agregar el trabajador porque el proyecto no está activo",
      });
    }

    // Validar que la cuadrilla esté activa
    if (cuadrilla.estado !== "activa") {
      return res.status(409).json({
        message: "No se puede agregar el trabajador porque la cuadrilla no está activa",
      });
    }

    // 1. Validar quién realiza la petición: administrador (libre)
    if (tipo_solicitante !== "administrador") {
        return res.status(403).json({
          message: "No tiene permisos para realizar esta acción",
        });
      }

    // 2. Validar que el trabajador a agregar exista
    const trabajador = await trabajadorRepository.findOne({
      where: { id_trabajador: Number(id_trabajador) },
    });
    if (!trabajador) {
      return res.status(404).json({ message: "Trabajador no encontrado" });
    }

    // 3. No permitir agregar a este endpoint a alguien con tipo_usuario "supervisor" o "administrador"
    if (trabajador.tipo_usuario === "supervisor" || trabajador.tipo_usuario === "administrador") {
      return res.status(400).json({
        message: "El trabajador tiene tipo_usuario 'supervisor' o 'administrador'. Si quiere agregar un supervisor a esta cuadrilla use el endpoint de supervisor para asignarlo.",
      });
    }

    // 4. Validar que no esté ya asignado a esta cuadrilla
    const yaAsignado = await asignadoRepository.findOne({
      where: {
        id_cuadrilla: Number(id_cuadrilla),
        id_trabajador: Number(id_trabajador),
      },
    });
    if (yaAsignado) {
      return res.status(409).json({
        message: "El trabajador ya está asignado a esta cuadrilla",
      });
    }

    // 5. Crear la asignación
    const nuevoAsignado = asignadoRepository.create({
      id_trabajador: Number(id_trabajador),
      id_cuadrilla: Number(id_cuadrilla),
      cargo_operativo,
      tipo_jornada,
      fecha_asignacion: new Date(),
    });

    await asignadoRepository.save(nuevoAsignado);

    return res.status(201).json({
      message: "Trabajador agregado correctamente a la cuadrilla",
      data: nuevoAsignado,
    });
  } catch (error) {
    console.error("Error en agregarTrabajadorCuadrilla:", error);
    return res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};

/***
 *  Elimina un trabajador de una cuadrilla
 *  Recibe (id_trabajador, id_cuadrilla)
 *  Validaciones:
 * - El que realiza la peticion debe tener tipo_usuario = administrador o tipo_usuario = supervisor y si es supervisor debe pertenecer a la cuadrilla de la cual se eliminara el trabajador
 * - El trabajador a eliminar no puede tener tipo_usuario = supervisor
 * - El trabajador a eliminar debe pertenecer a la cuadrilla de la cual se esta eliminando
 * - La cuadrilla de la cual se eliminara el trabajador debe existir
 * - El proyecto de la cuadrilla debe tener estado "activo"
 * - La cuadrilla debe tener estado "activa"
 */
export const eliminarTrabajadorCuadrilla = async (req, res) => {
  try {
    const { id_cuadrilla, id_trabajador } = req.body;
    const { id_trabajador: id_solicitante, tipo_usuario: tipo_solicitante } = req.user;

    if (!id_cuadrilla || !id_trabajador) {
      return res.status(400).json({
        message: "Los campos id_cuadrilla e id_trabajador son obligatorios",
      });
    }

    if (isNaN(Number(id_cuadrilla)) || isNaN(Number(id_trabajador))) {
      return res.status(400).json({
        message: "id_cuadrilla e id_trabajador deben ser numéricos",
      });
    }

    // 1. Validar que la cuadrilla exista (con su proyecto, para validar estado)
    const cuadrilla = await cuadrillaRepository.findOne({
      where: { id_cuadrilla: Number(id_cuadrilla) },
      relations: ["proyecto"],
    });
    if (!cuadrilla) {
      return res.status(404).json({ message: "Cuadrilla no encontrada" });
    }

    // Validar que el proyecto de la cuadrilla esté activo
    if (cuadrilla.proyecto.estado !== "activo") {
      return res.status(409).json({
        message: "No se puede eliminar el trabajador porque el proyecto no está activo",
      });
    }

    // Validar que la cuadrilla esté activa
    if (cuadrilla.estado !== "activa") {
      return res.status(409).json({
        message: "No se puede eliminar el trabajador porque la cuadrilla no está activa",
      });
    }

    // 2. Validar quién realiza la petición: administrador (libre) o supervisor (debe pertenecer a la cuadrilla)
    if (tipo_solicitante !== "administrador") {
        return res.status(403).json({
          message: "No tiene permisos para realizar esta acción",
        });
   } 

    // 3. Validar que el trabajador a eliminar exista
    const trabajador = await trabajadorRepository.findOne({
      where: { id_trabajador: Number(id_trabajador) },
    });
    if (!trabajador) {
      return res.status(404).json({ message: "Trabajador no encontrado" });
    }

    // 4. Validar que el trabajador a eliminar no tenga tipo_usuario = supervisor
    if (trabajador.tipo_usuario === "supervisor") {
      return res.status(400).json({
        message: "El trabajador tiene tipo_usuario 'supervisor'. Use el endpoint de supervisor para eliminarlo de la cuadrilla.",
      });
    }

    // 5. Validar que el trabajador pertenezca a la cuadrilla especificada
    const asignado = await asignadoRepository.findOne({
      where: {
        id_cuadrilla: Number(id_cuadrilla),
        id_trabajador: Number(id_trabajador),
      },
    });
    if (!asignado) {
      return res.status(404).json({
        message: "El trabajador no pertenece a la cuadrilla especificada",
      });
    }

    // 6. Eliminar la asignación (physical delete)
    await asignadoRepository.remove(asignado);

    return res.status(200).json({
      message: "Trabajador eliminado correctamente de la cuadrilla",
    });
  } catch (error) {
    console.error("Error en eliminarTrabajadorCuadrilla:", error);
    return res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};

/***
 * Obtiene una lista paginada de las cuadrillas a las que pertenece un trabajador de un proyecto, en base a un id_proyecto provisto en la URL y un id_trabajador proveido en el token.
 * Cada cuadrilla incluye una lista de sus integrantes con la forma:
 * { id_trabajador, nombres, apellidos, cargo_operativo, tipo_jornada, fecha_asignacion }
 * Validaciones
 * - El proyecto debe existir
 * - El proyecto debe tener estado = "activo"
 * Query params:
 * - page, limit: paginación
 * - orden: "alfabetico" para ordenar por nombre_cuadrilla, por defecto ordena por fecha_creacion
 */
export const getMyCuadrillasAndWorkersFromIdProyecto = async (req, res) => {
  try {
    const { id_proyecto } = req.params;
    const { id_trabajador: id_solicitante } = req.user;

    if (!id_proyecto) {
      return res.status(400).json({
        message: "El campo id_proyecto es obligatorio",
      });
    }

    if (isNaN(Number(id_proyecto))) {
      return res.status(400).json({
        message: "id_proyecto debe ser numérico",
      });
    }

    // Validar que el proyecto exista
    const proyecto = await proyectoRepository.findOne({
      where: { id_proyecto: Number(id_proyecto) },
    });
    if (!proyecto) {
      return res.status(404).json({ message: "Proyecto no encontrado" });
    }

    // Validar que el proyecto esté activo
    if (proyecto.estado !== "activo") {
      return res.status(409).json({
        message: "No se pueden listar las cuadrillas porque el proyecto no está activo",
      });
    }

    let { page = 1, limit = 10, orden } = req.query;

    page = Number(page);
    limit = Number(limit);

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 10;

    // Orden: por defecto fecha_creacion, opcionalmente alfabético por nombre_cuadrilla
    const columnaOrden = orden === "alfabetico" ? "cuadrilla.nombre_cuadrilla" : "cuadrilla.fecha_creacion";
    const direccionOrden = orden === "alfabetico" ? "ASC" : "DESC";

    // Solo las cuadrillas del proyecto a las que el solicitante está asignado
    const queryBase = cuadrillaRepository
      .createQueryBuilder("cuadrilla")
      .innerJoin("cuadrilla.asignados", "asignadoSolicitante")
      .where("cuadrilla.id_proyecto = :id_proyecto", { id_proyecto: Number(id_proyecto) })
      .andWhere("asignadoSolicitante.id_trabajador = :id_solicitante", { id_solicitante });

    const total = await queryBase.getCount();

    const cuadrillas = await queryBase
      .orderBy(columnaOrden, direccionOrden)
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const idsCuadrillas = cuadrillas.map((c) => c.id_cuadrilla);

    // Obtener los integrantes de todas las cuadrillas de la página actual
    // en una sola consulta, para luego agruparlos por id_cuadrilla en memoria.
    let integrantesRaw = [];
    if (idsCuadrillas.length > 0) {
      integrantesRaw = await asignadoRepository
        .createQueryBuilder("asignado")
        .innerJoin("asignado.trabajador", "trabajador")
        .where("asignado.id_cuadrilla IN (:...idsCuadrillas)", { idsCuadrillas })
        .select([
          "asignado.id_cuadrilla AS id_cuadrilla",
          "trabajador.id_trabajador AS id_trabajador",
          "trabajador.nombres AS nombres",
          "trabajador.apellidos AS apellidos",
          "trabajador.rut AS rut",
          "asignado.cargo_operativo AS cargo_operativo",
          "asignado.tipo_jornada AS tipo_jornada",
          "asignado.fecha_asignacion AS fecha_asignacion",
        ])
        .getRawMany();
    }

    // Agrupar integrantes por id_cuadrilla
    const integrantesPorCuadrilla = {};
    for (const integrante of integrantesRaw) {
      const { id_cuadrilla, ...datosIntegrante } = integrante;
      if (!integrantesPorCuadrilla[id_cuadrilla]) {
        integrantesPorCuadrilla[id_cuadrilla] = [];
      }
      integrantesPorCuadrilla[id_cuadrilla].push(datosIntegrante);
    }

    // Adjuntar la lista de integrantes a cada cuadrilla
    const cuadrillasConIntegrantes = cuadrillas.map((cuadrilla) => ({
      ...cuadrilla,
      integrantes: integrantesPorCuadrilla[cuadrilla.id_cuadrilla] || [],
    }));

    return res.status(200).json({
      data: cuadrillasConIntegrantes,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error en getMyCuadrillasAndWorkersFromIdProyecto:", error);
    return res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};


/***
 * Dado un id_cuadrilla entregado por param, Obtiene una lista de los integrantes de una cuadrilla dada.
 * Retorna una lista de tuplas (id_trabajador, nombres, apellidos, cargo_operativo, tipo_jornada, fecha_asignacion)
 * Validaciones
 * - El solicitante debe tener tipo_usuario = administrador
 * - La cuadrilla debe existir
 */
export const getIntegrantesOfCuadrilla = async (req, res) => {
  try {
    const { id_cuadrilla } = req.params;
    const { id_trabajador, tipo_usuario } = req.user;

    if (isNaN(Number(id_cuadrilla))) {
      return res.status(400).json({
        message: "id_cuadrilla debe ser numérico",
      });
    }

    // Validar que la cuadrilla exista
    const cuadrilla = await cuadrillaRepository.findOne({
      where: { id_cuadrilla: Number(id_cuadrilla) },
    });

    if (!cuadrilla) {
      return res.status(404).json({ message: "Cuadrilla no encontrada" });
    }

    // Si no es administrador, negar.
    if (tipo_usuario !== "administrador") {
      const pertenece = await asignadoRepository.findOne({
        where: { id_trabajador, id_cuadrilla: Number(id_cuadrilla) },
      });

      if (!pertenece) {
        return res.status(403).json({
          message: "No tiene permisos para ver los integrantes de esta cuadrilla",
        });
      }
    }

    // Obtener integrantes con los campos solicitados
    const integrantes = await asignadoRepository
      .createQueryBuilder("asignado")
      .innerJoin("asignado.trabajador", "trabajador")
      .where("asignado.id_cuadrilla = :id_cuadrilla", { id_cuadrilla: Number(id_cuadrilla) })
      .select([
        "trabajador.id_trabajador AS id_trabajador",
        "trabajador.nombres AS nombres",
        "trabajador.apellidos AS apellidos",
        "asignado.cargo_operativo AS cargo_operativo",
        "asignado.tipo_jornada AS tipo_jornada",
        "asignado.fecha_asignacion AS fecha_asignacion",
      ])
      .getRawMany();

    return res.status(200).json(integrantes);
  } catch (error) {
    console.error("Error al obtener los integrantes de la cuadrilla:", error);
    return res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};

/***
 * Obtener informacion de una cuadrilla especifica: mediante id_cuadrilla
 * Validaciones:
 * - El que realiza la peticion debe tener tipo_usuario = administrador o pertenecer a la cuadrilla que esta solicitando informacion
 * - La cuadrilla debe existir
 */
export const getCuadrillaData = async (req, res) => {
  try {
    const { id_cuadrilla } = req.params;
    const { id_trabajador, tipo_usuario: tipo_solicitante } = req.user;

    if (isNaN(Number(id_cuadrilla))) {
      return res.status(400).json({
        message: "id_cuadrilla debe ser numérico",
      });
    }

    // 2. Validar que la cuadrilla exista
    const cuadrilla = await cuadrillaRepository.findOne({
      where: { id_cuadrilla: Number(id_cuadrilla) },
      relations: ["proyecto"],
    });
    if (!cuadrilla) {
      return res.status(404).json({ message: "Cuadrilla no encontrada" });
    }

    // 1. Validar que sea administrador o pertenezca a la cuadrilla
    if (tipo_solicitante !== "administrador") {
      const pertenece = await asignadoRepository.findOne({
        where: {
          id_trabajador,
          id_cuadrilla: Number(id_cuadrilla),
        },
      });

      if (!pertenece) {
        return res.status(403).json({
          message: "No tiene permisos para ver la información de esta cuadrilla",
        });
      }
    }

    return res.status(200).json(cuadrilla);
  } catch (error) {
    console.error("Error en getCuadrillaData:", error);
    return res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};


/*
 * GET /supervisor/misCuadrillasAndIntegrantes
 *
 * Recibe (query, todos opcionales):
 *   page_cuadrillas   (int) – página de cuadrillas         (default: sin paginar)
 *   limit_cuadrillas  (int) – cuadrillas por página        (default: sin paginar)
 *   page_integrantes  (int) – página de integrantes        (default: sin paginar)
 *   limit_integrantes (int) – integrantes por página       (default: sin paginar)
 *   token: { id_trabajador } <- via authMiddleware
 *
 * Retorna 200 SIN paginación (comportamiento por defecto):
 *   {
 *     status: "success",
 *     data: [
 *       {
 *         id_cuadrilla, id_proyecto, nombre_cuadrilla, fecha_creacion, estado,
 *         integrantes: [{ id_trabajador, rut, nombres, apellidos, telefono,
 *                         correo, direccion, fecha_nacimiento, fecha_ingreso,
 *                         estado_laboral, cargo_operativo, tipo_jornada, fecha_asignacion }]
 *       }
 *     ]
 *   }
 *
 * Retorna 200 CON paginación (cuando se envían los params):
 *   {
 *     status: "success",
 *     data: [ ...misma estructura... ],
 *     meta: {
 *       cuadrillas: { total, page, limit, totalPages },
 *       integrantes: { page, limit }   <- aplica a cada cuadrilla individualmente
 *     }
 *   }
 */
export async function getMyCuadrillasAndIntegrantesFromToken(req, res) {
  try {
    const id_trabajador = req.user.id_trabajador;

    // ── Parámetros de paginación opcionales ───────────────────────────────────
    const paginarCuadrillas  = req.query.page_cuadrillas !== undefined || req.query.limit_cuadrillas !== undefined;
    const paginarIntegrantes = req.query.page_integrantes !== undefined || req.query.limit_integrantes !== undefined;

    const pageCuad  = Math.max(1, parseInt(req.query.page_cuadrillas)   || 1);
    const limitCuad = Math.max(1, parseInt(req.query.limit_cuadrillas)  || 10);

    const pageInt   = Math.max(1, parseInt(req.query.page_integrantes)  || 1);
    const limitInt  = Math.max(1, parseInt(req.query.limit_integrantes) || 10);

    const proyectoRepo   = AppDataSource.getRepository(ProyectoSchema);
    const cuadrillaRepository = AppDataSource.getRepository(CuadrillaSchema);

    // ── Paso 1: proyectos activos donde este trabajador es supervisor ─────────
    const proyectos = await proyectoRepo.find({
      where:  { id_supervisor: id_trabajador, estado: "activo" },
      select: ["id_proyecto"],
    });

    if (!proyectos.length) {
      return res.status(403).json({
        status:  "error",
        message: "No tienes proyectos activos asignados como supervisor.",
      });
    }

    const idProyectos = proyectos.map((p) => p.id_proyecto);

    // ── Paso 2: cuadrillas (con o sin paginación) ─────────────────────────────
    const findOptions = {
      where: { id_proyecto: In(idProyectos) },
      order: { nombre_cuadrilla: "ASC" },
    };

    let totalCuadrillas = 0;

    if (paginarCuadrillas) {
      findOptions.skip = (pageCuad - 1) * limitCuad;
      findOptions.take = limitCuad;
    }

    const [cuadrillas, total] = await cuadrillaRepository.findAndCount(findOptions);
    totalCuadrillas = total;

    if (!cuadrillas.length) {
      return res.status(200).json({ status: "success", data: [] });
    }

    const idCuadrillas = cuadrillas.map((c) => c.id_cuadrilla);

    // ── Paso 3: asignados con datos del trabajador ────────────────────────────
    const asignados = await AppDataSource.getRepository(AsignadoSchema)
      .createQueryBuilder("a")
      .innerJoinAndSelect("a.trabajador", "t")
      .where("a.id_cuadrilla IN (:...ids)", { ids: idCuadrillas })
      .orderBy("t.apellidos", "ASC")
      .addOrderBy("t.nombres", "ASC")
      .getMany();

    // ── Paso 4: agrupar asignados por id_cuadrilla ────────────────────────────
    const integrantesPorCuadrilla = {};

    for (const asignado of asignados) {
      const { id_cuadrilla, cargo_operativo, tipo_jornada, fecha_asignacion, trabajador } = asignado;

      if (!integrantesPorCuadrilla[id_cuadrilla]) {
        integrantesPorCuadrilla[id_cuadrilla] = [];
      }

      integrantesPorCuadrilla[id_cuadrilla].push({
        id_trabajador:    trabajador.id_trabajador,
        rut:              trabajador.rut,
        nombres:          trabajador.nombres,
        apellidos:        trabajador.apellidos,
        telefono:         trabajador.telefono,
        correo:           trabajador.correo,
        direccion:        trabajador.direccion,
        fecha_nacimiento: trabajador.fecha_nacimiento,
        fecha_ingreso:    trabajador.fecha_ingreso,
        estado_laboral:   trabajador.estado_laboral,
        cargo_operativo,
        tipo_jornada,
        fecha_asignacion,
      });
    }

    // ── Paso 5: armar respuesta, aplicando paginación de integrantes si aplica
    const data = cuadrillas.map((cuadrilla) => {
      let integrantes = integrantesPorCuadrilla[cuadrilla.id_cuadrilla] ?? [];

      if (paginarIntegrantes) {
        const skip = (pageInt - 1) * limitInt;
        integrantes = integrantes.slice(skip, skip + limitInt);
      }

      return {
        id_cuadrilla:     cuadrilla.id_cuadrilla,
        id_proyecto:      cuadrilla.id_proyecto,
        nombre_cuadrilla: cuadrilla.nombre_cuadrilla,
        fecha_creacion:   cuadrilla.fecha_creacion,
        estado:           cuadrilla.estado,
        integrantes,
      };
    });

    // ── Paso 6: construir respuesta con meta solo si se paginó ────────────────
    const response = { status: "success", data };

    if (paginarCuadrillas || paginarIntegrantes) {
      response.meta = {};

      if (paginarCuadrillas) {
        response.meta.cuadrillas = {
          total:      totalCuadrillas,
          page:       pageCuad,
          limit:      limitCuad,
          totalPages: Math.ceil(totalCuadrillas / limitCuad),
        };
      }

      if (paginarIntegrantes) {
        response.meta.integrantes = {
          page:  pageInt,
          limit: limitInt,
        };
      }
    }

    return res.status(200).json(response);

  } catch (error) {
    console.error("[getMyCuadrillasAndIntegrantesFromToken]", error);
    return res.status(500).json({ status: "error", message: "Error interno del servidor." });
  }
}