"use strict";

import { AppDataSource } from "../config/configDb.js";
import { ProyectoSchema } from "../entities/proyecto.entity.js";
import { ClienteSchema } from "../entities/cliente.entity.js";

const proyectoRepo = AppDataSource.getRepository(ProyectoSchema);
const clienteRepo = AppDataSource.getRepository(ClienteSchema);
const asignadoRepository = AppDataSource.getRepository("Asignado");

/***
 * Obtiene una lista de proyectos (Paginado y Ordenado)
 * Retorna arreglo de {id_proyecto, id_cliente, nombre_proyecto, tipo_instalacion, direccion, nivel_exigencia, cantidad_personal_requerido}
 * Cada proyecto incluye informacion de su cliente {id_cliente, nombres, apellidos, tipo_cliente, rubro, telefono, correo, direccion}
 * Query params:
 * Page: pagina de la busqueda
 * Limit: cantidad de proyectos a entregar por pagina
 * Orden: opcional "alfabetico", por default es por fecha de creacion
 * Validaciones:
 * - El que hace la peticion debe tener tipo_usuario = administrador
 */
export const getProyectos = async (req, res) => {
  try {
    const { tipo_usuario: tipo_solicitante } = req.user;

    // Validar que quien realiza la petición sea administrador
    if (tipo_solicitante !== "administrador") {
      return res.status(403).json({
        message: "No tiene permisos para realizar esta acción",
      });
    }

    let { page = 1, limit = 10, orden } = req.query;

    page = Number(page);
    limit = Number(limit);

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 10;

    // Orden: por defecto fecha_creacion, opcionalmente alfabético por nombre_proyecto
    const orderBy =
      orden === "alfabetico"
        ? { nombre_proyecto: "ASC" }
        : { fecha_creacion: "DESC" };

    const [proyectos, total] = await proyectoRepository.findAndCount({
      relations: ["cliente"],
      order: orderBy,
      skip: (page - 1) * limit,
      take: limit,
    });

    // Armar la respuesta solo con los campos solicitados
    const data = proyectos.map((proyecto) => ({
      id_proyecto: proyecto.id_proyecto,
      id_cliente: proyecto.id_cliente,
      nombre_proyecto: proyecto.nombre_proyecto,
      tipo_instalacion: proyecto.tipo_instalacion,
      direccion: proyecto.direccion,
      nivel_exigencia: proyecto.nivel_exigencia,
      cantidad_personal_requerido: proyecto.cantidad_personal_requerido,
      cliente: {
        id_cliente: proyecto.cliente.id_cliente,
        nombres: proyecto.cliente.nombres,
        apellidos: proyecto.cliente.apellidos,
        tipo_cliente: proyecto.cliente.tipo_cliente,
        rubro: proyecto.cliente.rubro,
        telefono: proyecto.cliente.telefono,
        correo: proyecto.cliente.correo,
        direccion: proyecto.cliente.direccion,
      },
    }));

    return res.status(200).json({
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error en getProyectos:", error);
    return res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};





















/***
 * Crea un nuevo proyecto
 * Validaciones
 * - El que crea el proyecto debe tener tipo_usuario = administrador
 * - El cliente id_cliente debe existir
 * - Los campos no deben estar vacios
 */
export const crearProyecto = async (req, res) => {
  try {
    const {
      id_cliente,
      nombre_proyecto,
      tipo_instalacion,
      direccion,
      nivel_exigencia,
      cantidad_personal_requerido,
    } = req.body;
    const { tipo_usuario: tipo_solicitante } = req.user;

    // 3. Validar que los campos no estén vacíos
    if (
      !id_cliente ||
      !nombre_proyecto ||
      !tipo_instalacion ||
      !direccion ||
      !nivel_exigencia ||
      !cantidad_personal_requerido
    ) {
      return res.status(400).json({
        message:
          "Los campos id_cliente, nombre_proyecto, tipo_instalacion, direccion, nivel_exigencia y cantidad_personal_requerido son obligatorios",
      });
    }

    if (isNaN(Number(id_cliente)) || isNaN(Number(cantidad_personal_requerido))) {
      return res.status(400).json({
        message: "id_cliente y cantidad_personal_requerido deben ser numéricos",
      });
    }

    // 1. Validar que quien realiza la petición sea administrador
    if (tipo_solicitante !== "administrador") {
      return res.status(403).json({
        message: "No tiene permisos para realizar esta acción",
      });
    }

    // 2. Validar que el cliente exista
    const cliente = await clienteRepository.findOne({
      where: { id_cliente: Number(id_cliente) },
    });
    if (!cliente) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }

    // Crear el proyecto
    const nuevoProyecto = proyectoRepository.create({
      id_cliente: Number(id_cliente),
      nombre_proyecto,
      tipo_instalacion,
      direccion,
      nivel_exigencia,
      cantidad_personal_requerido: Number(cantidad_personal_requerido),
    });

    await proyectoRepository.save(nuevoProyecto);

    return res.status(201).json({
      message: "Proyecto creado correctamente",
      data: nuevoProyecto,
    });
  } catch (error) {
    console.error("Error en crearProyecto:", error);
    return res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};
















/***
 * Actualiza un proyecto en base a su id_proyecto
 * Solo actualiza los campos que contena el body de la peticion
 * Validaciones:
 * - El que hace la peticion debe tener tipo_usuario = administrador
 * - El proyecto a actualizar debe existir
 * - La peticion debe contener al menos un campo a actualizar
 */
export const actualizarProyecto = async (req, res) => {
  try {
    const { id_proyecto } = req.params;
    const {
      nombre_proyecto,
      tipo_instalacion,
      direccion,
      nivel_exigencia,
      cantidad_personal_requerido,
    } = req.body;
    const { tipo_usuario: tipo_solicitante } = req.user;

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

    // 2. Validar que el proyecto exista
    const proyecto = await proyectoRepository.findOne({
      where: { id_proyecto: Number(id_proyecto) },
    });
    if (!proyecto) {
      return res.status(404).json({ message: "Proyecto no encontrado" });
    }

    // Validar que al menos un campo actualizable haya sido enviado
    if (
      nombre_proyecto === undefined &&
      tipo_instalacion === undefined &&
      direccion === undefined &&
      nivel_exigencia === undefined &&
      cantidad_personal_requerido === undefined
    ) {
      return res.status(400).json({
        message: "Debe enviar al menos un campo para actualizar",
      });
    }

    if (
      cantidad_personal_requerido !== undefined &&
      isNaN(Number(cantidad_personal_requerido))
    ) {
      return res.status(400).json({
        message: "cantidad_personal_requerido debe ser numérico",
      });
    }

    // Aplicar solo los campos enviados
    if (nombre_proyecto !== undefined) proyecto.nombre_proyecto = nombre_proyecto;
    if (tipo_instalacion !== undefined) proyecto.tipo_instalacion = tipo_instalacion;
    if (direccion !== undefined) proyecto.direccion = direccion;
    if (nivel_exigencia !== undefined) proyecto.nivel_exigencia = nivel_exigencia;
    if (cantidad_personal_requerido !== undefined)
      proyecto.cantidad_personal_requerido = Number(cantidad_personal_requerido);

    await proyectoRepository.save(proyecto);

    return res.status(200).json({
      message: "Proyecto actualizado correctamente",
      data: proyecto,
    });
  } catch (error) {
    console.error("Error en actualizarProyecto:", error);
    return res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};




















/***
 * Inactivacion de Proyecto (Soft Delete)
 * Se cambia el estado de un proyecto y sus cuadrillas a "inactivo" e "inactiva" respectivamente.
 * El proceso de inactivar las cuadrillas sucede en cascada, mediante una transaccion atomica.
 * Validaciones:
 * - El que realiza la peticion debe tener tipo_usuario = administrador
 * - Si en la cascada una cuadrilla ya se encontraba inactiva, dejarla asi
 */
export const inactivarProyecto = async (req, res) => {
  // Se crea un queryRunner para envolver las operaciones en una transacción.
  // Razón: este endpoint realiza 2 escrituras dependientes (UPDATE proyecto +
  // UPDATE cuadrillas). Sin transacción, si la segunda escritura falla luego
  // de que la primera ya se confirmó, el proyecto quedaría "inactivo" pero
  // sus cuadrillas seguirían "activas" -> estado inconsistente en la BD.
  // Con la transacción, o se aplican ambos cambios, o no se aplica ninguno.
  const queryRunner = AppDataSource.createQueryRunner();

  try {
    const { id } = req.params;
    const { tipo_usuario: tipo_solicitante } = req.user;

    if (isNaN(Number(id))) {
      return res.status(400).json({
        message: "id debe ser numérico",
      });
    }

    // 1. Validar que quien realiza la petición sea administrador
    if (tipo_solicitante !== "administrador") {
      return res.status(403).json({
        message: "No tiene permisos para realizar esta acción",
      });
    }

    // Validar que el proyecto exista
    // Se usa el repositorio normal (fuera de la transacción) porque es solo
    // lectura: no hay riesgo de inconsistencia si esto se ejecuta antes de
    // abrir la transacción.
    const proyecto = await proyectoRepository.findOne({
      where: { id_proyecto: Number(id) },
    });
    if (!proyecto) {
      return res.status(404).json({ message: "Proyecto no encontrado" });
    }

    // Conectar el queryRunner y abrir la transacción.
    // A partir de aquí, todas las escrituras deben hacerse a través de
    // queryRunner.manager (no de proyectoRepository/cuadrillaRepository
    // directamente), para que queden dentro de la misma transacción.
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Inactivar el proyecto
      await queryRunner.manager
        .createQueryBuilder()
        .update("Proyecto")
        .set({ estado: "inactivo" })
        .where("id_proyecto = :id_proyecto", { id_proyecto: Number(id) })
        .execute();

      // 2. Cascada: inactivar cuadrillas del proyecto, dejando intactas
      // (sin tocar) las que ya estaban "inactiva".
      await queryRunner.manager
        .createQueryBuilder()
        .update("Cuadrilla")
        .set({ estado: "inactiva" })
        .where("id_proyecto = :id_proyecto", { id_proyecto: Number(id) })
        .andWhere("estado != :estadoInactiva", { estadoInactiva: "inactiva" })
        .execute();

      // Si ambas operaciones se ejecutaron sin error, se confirman de forma
      // permanente. Antes de este punto, ningún cambio es visible para
      // otras conexiones/queries fuera de esta transacción.
      await queryRunner.commitTransaction();
    } catch (innerError) {
      // Si cualquiera de las dos operaciones falla, se revierte todo lo
      // hecho dentro de la transacción (incluyendo el UPDATE del proyecto
      // si ya se había ejecutado), dejando la BD exactamente como estaba
      // antes de iniciar este endpoint.
      await queryRunner.rollbackTransaction();
      throw innerError;
    } finally {
      // El queryRunner mantiene una conexión dedicada del pool; siempre se
      // libera, haya habido éxito o fallo, para no agotar el pool de
      // conexiones disponibles.
      await queryRunner.release();
    }

    // Se relee el proyecto para devolver el estado actualizado al cliente
    // (proyecto.estado en memoria aún reflejaría el valor previo a la
    // transacción, ya que no se modificó la entidad local).
    const proyectoActualizado = await proyectoRepository.findOne({
      where: { id_proyecto: Number(id) },
    });

    return res.status(200).json({
      message: "Proyecto inactivado correctamente junto con sus cuadrillas",
      data: proyectoActualizado,
    });
  } catch (error) {
    console.error("Error en inactivarProyecto:", error);
    return res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};












/***
 * Obtiene una lista paginada de los proyectos a los que pertenece un trabajador, en base a un id_trabajador proveido en el token.
 * Cada proyecto de la lista viene de la forma:
 * { id_proyecto, nombre_proyecto, tipo_instalacion, direccion, nivel_exigencia, cantidad_personal_requerido }
 * Query params:
 * - page: pagina de la busqueda
 * - limit: cantidad de proyectos a entregar por pagina
 * - orden: opcional "alfabetico", por default es por fecha de creacion
 */
export const getMyProyectosByToken = async (req, res) => {
  try {
    const { id_trabajador: id_solicitante } = req.user;

    let { page = 1, limit = 10, orden } = req.query;

    page = Number(page);
    limit = Number(limit);

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 10;

    // Orden: por defecto fecha_creacion, opcionalmente alfabético por nombre_proyecto
    const columnaOrden = orden === "alfabetico" ? "proyecto.nombre_proyecto" : "proyecto.fecha_creacion";
    const direccionOrden = orden === "alfabetico" ? "ASC" : "DESC";

    // Solo los proyectos donde el solicitante pertenece a alguna cuadrilla
    // (via Cuadrilla -> Asignado). Se usa DISTINCT para no repetir el mismo
    // proyecto si el solicitante está en varias cuadrillas del mismo proyecto.
    const queryBase = proyectoRepository
      .createQueryBuilder("proyecto")
      .innerJoin("proyecto.cuadrillas", "cuadrillaDelSolicitante")
      .innerJoin("cuadrillaDelSolicitante.asignados", "asignadoSolicitante")
      .where("asignadoSolicitante.id_trabajador = :id_solicitante", { id_solicitante });

    const total = await queryBase
      .clone()
      .select("DISTINCT proyecto.id_proyecto")
      .getCount();

    const proyectos = await queryBase
      .clone()
      .distinct(true)
      .orderBy(columnaOrden, direccionOrden)
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    // Armar la respuesta solo con los campos solicitados
    const data = proyectos.map((proyecto) => ({
      id_proyecto: proyecto.id_proyecto,
      nombre_proyecto: proyecto.nombre_proyecto,
      tipo_instalacion: proyecto.tipo_instalacion,
      direccion: proyecto.direccion,
      nivel_exigencia: proyecto.nivel_exigencia,
      cantidad_personal_requerido: proyecto.cantidad_personal_requerido,
    }));

    return res.status(200).json({
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error en getMyProyectosByToken:", error);
    return res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};













/***
 * Obtiene informacion de un proyecto en base a su: id_proyecto
 * Validaciones
 * - Trabajador/Supervisor deben pertenecer a alguna cuadrilla del proyecto
 * - Administrador puede ver cualquier proyecto
 */
export const getProyectData = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_trabajador, tipo_usuario } = req.user; // viene del authMiddleware

    const proyecto = await proyectoRepository.findOne({
      where: { id_proyecto: id },
      relations: ["cliente", "cuadrillas"],
    });

    if (!proyecto) {
      return res.status(404).json({ message: "Proyecto no encontrado" });
    }

    // Si es administrador, tiene acceso directo
    if (tipo_usuario === "administrador") {
      return res.status(200).json(proyecto);
    }

    // Si no es administrador, validar que pertenezca a alguna cuadrilla del proyecto
    const idsCuadrillas = proyecto.cuadrillas.map((c) => c.id_cuadrilla);

    if (idsCuadrillas.length === 0) {
      return res.status(403).json({
        message: "No tiene permisos para ver este proyecto",
      });
    }

    const pertenece = await asignadoRepository
      .createQueryBuilder("asignado")
      .where("asignado.id_trabajador = :id_trabajador", { id_trabajador })
      .andWhere("asignado.id_cuadrilla IN (:...idsCuadrillas)", { idsCuadrillas })
      .andWhere("asignado.fecha_retiro IS NULL") // opcional: solo asignaciones activas, checar mas adelante *********
      .getOne();

    if (!pertenece) {
      return res.status(403).json({
        message: "No tiene permisos para ver este proyecto",
      });
    }

    return res.status(200).json(proyecto);
  } catch (error) {
    console.error("Error al obtener el proyecto:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};





/***
 * Reactiva un proyecto en base a su id_proyecto (No reactiva cuadrillas en cascada)
 * Validaciones:
 * - El que realiza la peticion debe tener tipo_usuario = administrador
 * - El proyecto debe existir
 */
export const reactivarProyecto = async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo_usuario: tipo_solicitante } = req.user;

    if (isNaN(Number(id))) {
      return res.status(400).json({
        message: "id debe ser numérico",
      });
    }

    // 1. Validar que quien realiza la petición sea administrador
    if (tipo_solicitante !== "administrador") {
      return res.status(403).json({
        message: "No tiene permisos para realizar esta acción",
      });
    }

    // 2. Validar que el proyecto exista
    const proyecto = await proyectoRepository.findOne({
      where: { id_proyecto: Number(id) },
    });
    if (!proyecto) {
      return res.status(404).json({ message: "Proyecto no encontrado" });
    }

    // Reactivar el proyecto. Solo es una escritura simple (sin operaciones
    // dependientes), por lo que no se necesita transacción/queryRunner aquí
    // a diferencia de inactivarProyecto.
    proyecto.estado = "activo";
    await proyectoRepository.save(proyecto);

    return res.status(200).json({
      message: "Proyecto reactivado correctamente",
      data: proyecto,
    });
  } catch (error) {
    console.error("Error en reactivarProyecto:", error);
    return res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};