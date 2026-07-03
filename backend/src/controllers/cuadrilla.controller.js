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
    const { id_cuadrilla } = req.params;
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
 * Agrega un id_trabajador (supervisor) a una cuadrilla id_cuadrilla
 * - Validacion 1: el que realiza la peticion post debe tener tipo_usuario = administrador
 * - Validacion 2: El id_trabajador a agregar no puede tener tipo_usuario = trabajador o tipo_usuario = administrador
 * - Validacion 3: El supervisor a agregar no puede existir ya en la cuadrilla
 * - Validacion 4: El proyecto de la cuadrilla debe estar "activo"
 * - Validacion 5: La cuadrilla debe estar "activa"
 */
export const agregarSupervisorCuadrilla = async (req, res) => {
  try {
    const { id_cuadrilla, id_trabajador, cargo_operativo, tipo_jornada } = req.body;
    const { tipo_usuario: tipo_solicitante } = req.user;

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

    // 4. Validar que el proyecto de la cuadrilla esté activo
    if (cuadrilla.proyecto.estado !== "activo") {
      return res.status(409).json({
        message: "No se puede agregar el supervisor porque el proyecto no está activo",
      });
    }

    // 5. Validar que la cuadrilla esté activa
    if (cuadrilla.estado !== "activa") {
      return res.status(409).json({
        message: "No se puede agregar el supervisor porque la cuadrilla no está activa",
      });
    }

    // 3. Validar que el trabajador a agregar exista
    const trabajador = await trabajadorRepository.findOne({
      where: { id_trabajador: Number(id_trabajador) },
    });
    if (!trabajador) {
      return res.status(404).json({ message: "Trabajador no encontrado" });
    }

    // No permitir agregar a este endpoint a alguien con tipo_usuario "trabajador" o "administrador"
    if (trabajador.tipo_usuario === "trabajador" || trabajador.tipo_usuario === "administrador") {
      return res.status(400).json({
        message: "El trabajador debe tener tipo_usuario 'supervisor' para ser agregado mediante este endpoint.",
      });
    }

    // Validar que no esté ya asignado a esta cuadrilla
    const yaAsignado = await asignadoRepository.findOne({
      where: {
        id_cuadrilla: Number(id_cuadrilla),
        id_trabajador: Number(id_trabajador),
      },
    });
    if (yaAsignado) {
      return res.status(409).json({
        message: "El supervisor ya está asignado a esta cuadrilla",
      });
    }

    // Crear la asignación
    const nuevoAsignado = asignadoRepository.create({
      id_trabajador: Number(id_trabajador),
      id_cuadrilla: Number(id_cuadrilla),
      cargo_operativo: cargo_operativo || null,
      tipo_jornada: tipo_jornada || null,
      fecha_asignacion: new Date(),
    });

    await asignadoRepository.save(nuevoAsignado);

    return res.status(201).json({
      message: "Supervisor agregado correctamente a la cuadrilla",
      data: nuevoAsignado,
    });
  } catch (error) {
    console.error("Error en agregarSupervisorCuadrilla:", error);
    return res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};













/***
 * Elimina un id_trabajador con tipo_usuario = supervisor, de una cuadrilla id_cuadrilla
 * Validaciones:
 * - el que realiza la peticion debe tener tipo_usuario = administrador
 * - El id_trabajador a eliminar debe tener tipo_usuario = supervisor
 * - Tanto el supervisor como la cuadrilla a la que pertenece deben existir
 * - El supervisor a eliminar debe pertenecer a la cuadrilla especificada
 * - El proyecto de la cuadrilla debe tener estado "activo"
 * - La cuadrilla debe estar "activa"
 */
export const eliminarSupervisorCuadrilla = async (req, res) => {
  try {
    const { id_cuadrilla, id_trabajador } = req.body;
    const { tipo_usuario: tipo_solicitante } = req.user;

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

    // Validar que el proyecto de la cuadrilla esté activo
    if (cuadrilla.proyecto.estado !== "activo") {
      return res.status(409).json({
        message: "No se puede eliminar el supervisor porque el proyecto no está activo",
      });
    }

    // Validar que la cuadrilla esté activa
    if (cuadrilla.estado !== "activa") {
      return res.status(409).json({
        message: "No se puede eliminar el supervisor porque la cuadrilla no está activa",
      });
    }

    // 3. Validar que el trabajador exista
    const trabajador = await trabajadorRepository.findOne({
      where: { id_trabajador: Number(id_trabajador) },
    });
    if (!trabajador) {
      return res.status(404).json({ message: "Trabajador no encontrado" });
    }

    // 4. Validar que el trabajador a eliminar tenga tipo_usuario = supervisor
    if (trabajador.tipo_usuario !== "supervisor") {
      return res.status(400).json({
        message: "El trabajador indicado no tiene tipo_usuario 'supervisor'",
      });
    }

    // 5. Validar que el supervisor pertenezca a la cuadrilla especificada
    const asignado = await asignadoRepository.findOne({
      where: {
        id_cuadrilla: Number(id_cuadrilla),
        id_trabajador: Number(id_trabajador),
      },
    });
    if (!asignado) {
      return res.status(404).json({
        message: "El supervisor no pertenece a la cuadrilla especificada",
      });
    }

    // 6. Eliminar la asignación (physical delete)
    await asignadoRepository.remove(asignado);

    return res.status(200).json({
      message: "Supervisor eliminado correctamente de la cuadrilla",
    });
  } catch (error) {
    console.error("Error en eliminarSupervisorCuadrilla:", error);
    return res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};














/***
 * Obtiene una lista paginada de las cuadrillas de un proyecto, en base a su id_proyecto.
 * Cada cuadrilla incluye una lista de sus integrantes con la forma:
 * { id_trabajador, nombres, apellidos, cargo_operativo, es_bodeguero, tipo_jornada, fecha_asignacion }
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

    // Validacion 3: el proyecto debe estar activo
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
 * - El que realiza la peticion post debe tener tipo_usuario = administrador, o tipo_usuario = supervisor y si es supervisor debe pertenecer a la cuadrilla a la cual se agregara el trabajador, revisar esto usando el token)
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
    // validar pertenencia del supervisor y los estados de proyecto/cuadrilla)
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

    // 1. Validar quién realiza la petición: administrador (libre) o supervisor (debe pertenecer a la cuadrilla)
    if (tipo_solicitante !== "administrador") {
      if (tipo_solicitante !== "supervisor") {
        return res.status(403).json({
          message: "No tiene permisos para realizar esta acción",
        });
      }

      const supervisorPertenece = await asignadoRepository.findOne({
        where: {
          id_trabajador: id_solicitante,
          id_cuadrilla: Number(id_cuadrilla),
        },
      });

      if (!supervisorPertenece) {
        return res.status(403).json({
          message: "El supervisor no pertenece a la cuadrilla indicada",
        });
      }
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
      if (tipo_solicitante !== "supervisor") {
        return res.status(403).json({
          message: "No tiene permisos para realizar esta acción",
        });
      }

      const supervisorPertenece = await asignadoRepository.findOne({
        where: {
          id_trabajador: id_solicitante,
          id_cuadrilla: Number(id_cuadrilla),
        },
      });

      if (!supervisorPertenece) {
        return res.status(403).json({
          message: "El supervisor no pertenece a la cuadrilla indicada",
        });
      }
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
 * { id_trabajador, nombres, apellidos, cargo_operativo, es_bodeguero, tipo_jornada, fecha_asignacion }
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
 * Retorna una lista de tuplas (id_trabajador, nombres, apellidos, cargo_operativo, tipo_jornada, es_bodeguero, fecha_asignacion)
 * Validaciones
 * - El solicitante debe tener tipo_usuario = administrador || El solicitante debe pertenecer a la cuadrilla (validar mediante token)
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

    // Si no es administrador, validar que pertenezca a la cuadrilla
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
















/***
 * Asigna a un trabajador como bodeguero dentro de una cuadrilla
 * Recibe: id_trabajador, id_cuadrilla (body)
 * Validaciones:
 * - El que realiza la peticion debe tener tipo_usuario = administrador o tipo_usuario = supervisor, si es supervisor debe pertenecer a la cuadrilla
 * - El trabajador a asignar como bodeguero debe pertenecer a la cuadrilla
 * - El trabajador debe existir
 * - El proyecto debe tener estado "activo"
 * - La cuadrilla debe tener estado "activa"
 * - El trabajador no debe ser ya bodeguero
 */
export const asignarBodeguero = async (req, res) => {
  try {
    const { id_trabajador, id_cuadrilla } = req.body;
    const { id_trabajador: id_solicitante, tipo_usuario: tipo_solicitante } = req.user;

    if (!id_trabajador || !id_cuadrilla) {
      return res.status(400).json({
        message: "Los campos id_trabajador e id_cuadrilla son obligatorios",
      });
    }

    if (isNaN(Number(id_trabajador)) || isNaN(Number(id_cuadrilla))) {
      return res.status(400).json({
        message: "id_trabajador e id_cuadrilla deben ser numéricos",
      });
    }

    // Validar que la cuadrilla exista (con su proyecto, para validar estados)
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
        message: "No se puede asignar bodeguero porque el proyecto no está activo",
      });
    }

    // Validar que la cuadrilla esté activa
    if (cuadrilla.estado !== "activa") {
      return res.status(409).json({
        message: "No se puede asignar bodeguero porque la cuadrilla no está activa",
      });
    }

    // Validar quién realiza la petición: administrador (libre) o supervisor (debe pertenecer a la cuadrilla)
    if (tipo_solicitante !== "administrador") {
      if (tipo_solicitante !== "supervisor") {
        return res.status(403).json({
          message: "No tiene permisos para realizar esta acción",
        });
      }

      const supervisorPertenece = await asignadoRepository.findOne({
        where: {
          id_trabajador: id_solicitante,
          id_cuadrilla: Number(id_cuadrilla),
        },
      });

      if (!supervisorPertenece) {
        return res.status(403).json({
          message: "El supervisor no pertenece a la cuadrilla indicada",
        });
      }
    }

    // Validar que el trabajador exista
    const trabajador = await trabajadorRepository.findOne({
      where: { id_trabajador: Number(id_trabajador) },
    });
    if (!trabajador) {
      return res.status(404).json({ message: "Trabajador no encontrado" });
    }

    // Validar que el trabajador pertenezca a la cuadrilla
    const asignado = await asignadoRepository.findOne({
      where: {
        id_trabajador: Number(id_trabajador),
        id_cuadrilla: Number(id_cuadrilla),
      },
    });
    if (!asignado) {
      return res.status(404).json({
        message: "El trabajador no pertenece a la cuadrilla indicada",
      });
    }

    return res.status(200).json({
      message: "La operación de bodeguero no se persiste porque el campo ya no existe en la base de datos.",
      data: asignado,
    });
  } catch (error) {
    console.error("Error en asignarBodeguero:", error);
    return res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};






/***
 * Despoja a un trabajador del rol de bodeguero dentro de una cuadrilla
 * Recibe: id_trabajador, id_cuadrilla (body)
 * Validaciones:
 * - El que realiza la peticion debe tener tipo_usuario = administrador o tipo_usuario = supervisor, si es supervisor debe pertenecer a la cuadrilla
 * - El trabajador a despojar como bodeguero debe pertenecer a la cuadrilla
 * - El trabajador debe existir
 * - El proyecto debe tener estado "activo"
 * - La cuadrilla debe tener estado "activa"
 * - El trabajador debe ser bodeguero
 */
export const despojarBodeguero = async (req, res) => {
  try {
    const { id_trabajador, id_cuadrilla } = req.body;
    const { id_trabajador: id_solicitante, tipo_usuario: tipo_solicitante } = req.user;

    if (!id_trabajador || !id_cuadrilla) {
      return res.status(400).json({
        message: "Los campos id_trabajador e id_cuadrilla son obligatorios",
      });
    }

    if (isNaN(Number(id_trabajador)) || isNaN(Number(id_cuadrilla))) {
      return res.status(400).json({
        message: "id_trabajador e id_cuadrilla deben ser numéricos",
      });
    }

    // Validar que la cuadrilla exista (con su proyecto, para validar estados)
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
        message: "No se puede despojar al bodeguero porque el proyecto no está activo",
      });
    }

    // Validar que la cuadrilla esté activa
    if (cuadrilla.estado !== "activa") {
      return res.status(409).json({
        message: "No se puede despojar al bodeguero porque la cuadrilla no está activa",
      });
    }

    // Validar quién realiza la petición: administrador (libre) o supervisor (debe pertenecer a la cuadrilla)
    if (tipo_solicitante !== "administrador") {
      if (tipo_solicitante !== "supervisor") {
        return res.status(403).json({
          message: "No tiene permisos para realizar esta acción",
        });
      }

      const supervisorPertenece = await asignadoRepository.findOne({
        where: {
          id_trabajador: id_solicitante,
          id_cuadrilla: Number(id_cuadrilla),
        },
      });

      if (!supervisorPertenece) {
        return res.status(403).json({
          message: "El supervisor no pertenece a la cuadrilla indicada",
        });
      }
    }

    // Validar que el trabajador exista
    const trabajador = await trabajadorRepository.findOne({
      where: { id_trabajador: Number(id_trabajador) },
    });
    if (!trabajador) {
      return res.status(404).json({ message: "Trabajador no encontrado" });
    }

    // Validar que el trabajador pertenezca a la cuadrilla
    const asignado = await asignadoRepository.findOne({
      where: {
        id_trabajador: Number(id_trabajador),
        id_cuadrilla: Number(id_cuadrilla),
      },
    });
    if (!asignado) {
      return res.status(404).json({
        message: "El trabajador no pertenece a la cuadrilla indicada",
      });
    }

    return res.status(200).json({
      message: "La operación de bodeguero no se persiste porque el campo ya no existe en la base de datos.",
      data: asignado,
    });
  } catch (error) {
    console.error("Error en despojarBodeguero:", error);
    return res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};



























// controllers/cuadrilla.controller.js



/*
 * GET /supervisor/misCuadrillasAndIntegrantes
 *
 * Recibe:
 *   - req.user.id_trabajador  (desde el token JWT via authMiddleware)
 *
 * Validación:
 *   - El id_trabajador del token debe coincidir con el campo id_supervisor
 *     de al menos un Proyecto activo (es decir, el usuario autenticado
 *     debe ser supervisor de algún proyecto).
 *
 * Retorna:
 *   [
 *     {
 *       id_cuadrilla,
 *       id_proyecto,
 *       nombre_cuadrilla,
 *       fecha_creacion,
 *       estado,
 *       integrantes: [
 *         {
 *           id_trabajador,
 *           rut,
 *           nombres,
 *           apellidos,
 *           telefono,
 *           correo,
 *           direccion,
 *           fecha_nacimiento,
 *           fecha_ingreso,
 *           estado_laboral,
 *           cargo_operativo,    <- viene de Asignado
 *           tipo_jornada,       <- viene de Asignado
 *           fecha_asignacion    <- viene de Asignado
 *         }
 *       ]
 *     }
 *   ]
 */
export async function getMyCuadrillasAndIntegrantesFromToken(req, res) {
  try {
    const id_trabajador = req.user.id_trabajador;

    const proyectoRepo  = AppDataSource.getRepository(ProyectoSchema);
    const cuadrillaRepository = AppDataSource.getRepository(CuadrillaSchema);

    // ── Paso 1: proyectos activos donde este trabajador es supervisor ─────────
    const proyectos = await proyectoRepo.find({
      where: { id_supervisor: id_trabajador, estado: "activo" },
      select: ["id_proyecto"],
    });

    // ── Validación 1: debe supervisar al menos un proyecto ────────────────────
    if (!proyectos.length) {
      return res.status(403).json({
        status: "error",
        message: "No tienes proyectos activos asignados como supervisor.",
      });
    }

    const idProyectos = proyectos.map((p) => p.id_proyecto);

    // ── Paso 2: cuadrillas de esos proyectos ──────────────────────────────────
    const cuadrillas = await cuadrillaRepository.find({
      where: { id_proyecto: In(idProyectos) },
    });

    if (!cuadrillas.length) {
      return res.status(200).json({ status: "success", data: [] });
    }

    const idCuadrillas = cuadrillas.map((c) => c.id_cuadrilla);

    // ── Paso 3: asignados con datos del trabajador (un solo query, sin N+1) ───
    const asignados = await AppDataSource.getRepository(AsignadoSchema)
      .createQueryBuilder("a")
      .innerJoinAndSelect("a.trabajador", "t")
      .where("a.id_cuadrilla IN (:...ids)", { ids: idCuadrillas })
      .getMany();

    // ── Paso 4: agrupar asignados por id_cuadrilla ────────────────────────────
    const integrantesPorCuadrilla = {};

    for (const asignado of asignados) {
      const { id_cuadrilla, cargo_operativo, tipo_jornada, fecha_asignacion, trabajador } = asignado;

      if (!integrantesPorCuadrilla[id_cuadrilla]) {
        integrantesPorCuadrilla[id_cuadrilla] = [];
      }

      integrantesPorCuadrilla[id_cuadrilla].push({
        id_trabajador:   trabajador.id_trabajador,
        rut:             trabajador.rut,
        nombres:         trabajador.nombres,
        apellidos:       trabajador.apellidos,
        telefono:        trabajador.telefono,
        correo:          trabajador.correo,
        direccion:       trabajador.direccion,
        fecha_nacimiento: trabajador.fecha_nacimiento,
        fecha_ingreso:   trabajador.fecha_ingreso,
        estado_laboral:  trabajador.estado_laboral,
        cargo_operativo,
        tipo_jornada,
        fecha_asignacion,
      });
    }

    // ── Paso 5: armar respuesta final ─────────────────────────────────────────
    const data = cuadrillas.map((cuadrilla) => ({
      id_cuadrilla:    cuadrilla.id_cuadrilla,
      id_proyecto:     cuadrilla.id_proyecto,
      nombre_cuadrilla: cuadrilla.nombre_cuadrilla,
      fecha_creacion:  cuadrilla.fecha_creacion,
      estado:          cuadrilla.estado,
      integrantes:     integrantesPorCuadrilla[cuadrilla.id_cuadrilla] ?? [],
    }));

    return res.status(200).json({ status: "success", data });

  } catch (error) {
    console.error("[getMyCuadrillasAndIntegrantesFromToken]", error);
    return res.status(500).json({ status: "error", message: "Error interno del servidor." });
  }
}