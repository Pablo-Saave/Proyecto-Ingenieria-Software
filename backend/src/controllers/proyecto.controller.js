"use strict";

import { AppDataSource } from "../config/configDb.js";
import { ProyectoSchema } from "../entities/proyecto.entity.js";
import { CuadrillaSchema } from "../entities/cuadrilla.entity.js";

const ORDENES_VALIDOS = ["nombre_proyecto", "fecha_creacion"];
const ESTADOS_VALIDOS = ["activo", "inactivo"];

const proyectoRepo = AppDataSource.getRepository(ProyectoSchema);

function hoyLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}


/*
 * POST /
 *
 * Recibe (body):
 *   id_cliente                  (int)    – cliente al que pertenece el proyecto
 *   id_supervisor               (int)    – trabajador que supervisará el proyecto
 *   nombre_proyecto             (string)
 *   tipo_instalacion            (string)
 *   direccion                   (string)
 *   nivel_exigencia             (string)
 *   cantidad_personal_requerido (int)
 *
 * Retorna 201:
 *   {
 *     status: "success",
 *     message: "Proyecto creado exitosamente.",
 *     data: {
 *       id_proyecto,
 *       id_cliente,
 *       id_supervisor,
 *       nombre_proyecto,
 *       tipo_instalacion,
 *       direccion,
 *       nivel_exigencia,
 *       cantidad_personal_requerido,
 *       fecha_creacion,   <- generada automáticamente (fecha actual)
 *       estado            <- "activo" por defecto
 *     }
 *   }
 */
export async function crearProyecto(req, res) {
  try {
    const {
      id_cliente,
      id_supervisor,
      nombre_proyecto,
      tipo_instalacion,
      direccion,
      nivel_exigencia,
      cantidad_personal_requerido,
    } = req.body;

    const nuevoProyecto = proyectoRepo.create({
      id_cliente:                 Number(id_cliente),
      id_supervisor:              Number(id_supervisor),
      nombre_proyecto,
      tipo_instalacion,
      direccion,
      nivel_exigencia,
      cantidad_personal_requerido: Number(cantidad_personal_requerido),
      fecha_creacion:             hoyLocal(),
      estado:                     "activo",
    });

    const proyectoGuardado = await proyectoRepo.save(nuevoProyecto);

    return res.status(201).json({
      status:  "success",
      message: "Proyecto creado exitosamente.",
      data:    proyectoGuardado,
    });
  } catch (error) {
    console.error("[crearProyecto]", error);
    return res.status(500).json({ status: "error", message: "Error interno del servidor." });
  }
}






/*
 * getAllProyectos
 * Retorna todos los proyectos del sistema con su cliente, inventarios
 * y contrato de proyecto (con anexos). Paginado y ordenable.
 *
 * Recibe:
 *   query: {
 *     page   (int,    default 1),
 *     limit  (int,    default 10),
 *     orden  (string, default "nombre_proyecto" | "fecha_creacion"),
 *     filtro (string, opcional -> "activo" | "inactivo")
 *   }
 *   token: { id_trabajador, tipo_usuario }  <- via authMiddleware
 *
 * Retorna 200:
 *   {
 *     data: [
 *       {
 *         id_proyecto, id_cliente, id_supervisor, nombre_proyecto,
 *         tipo_instalacion, direccion, nivel_exigencia,
 *         cantidad_personal_requerido, fecha_creacion, estado,
 *         cliente:           { id_cliente, nombres, apellidos, tipo_cliente,
 *                              rubro, telefono, correo, direccion },
 *         inventarios:       [{ id_inventario, id_proyecto, nombre_inventario }],
 *         contratoProyecto:  {
 *           id_contrato_proyecto, id_proyecto, descripcion, fecha_inicio,
 *           fecha_termino, fecha_extension, estado_contrato, monto,
 *           anexos: [{ id_anexo_contrato_proyecto, id_contrato_proyecto,
 *                      monto_nuevo, fecha_anexo, fecha_vigencia,
 *                      motivo, descripcion_modificacion, observaciones }]
 *         }
 *       }
 *     ],
 *     meta: { total, page, limit, totalPages, orden, filtro }
 *   }
 */
export async function getAllProyectos(req, res) {
  try {
    // ── Validación 1: solo administrador ──────────────────────────────────────
    if (req.user?.tipo_usuario !== "administrador") {
      return res.status(403).json({
        status:  "error",
        message: "Solo un administrador puede listar todos los proyectos.",
      });
    }

    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.max(1, parseInt(req.query.limit) || 10);
    const skip   = (page - 1) * limit;
    const orden  = ORDENES_VALIDOS.includes(req.query.orden) ? req.query.orden : "nombre_proyecto";
    const filtro = ESTADOS_VALIDOS.includes(req.query.filtro) ? req.query.filtro : null;


    const where = filtro ? { estado: filtro } : {};

    const [proyectos, total] = await proyectoRepo.findAndCount({
      where,
      relations: [
        "cliente",
        "inventarios",
        "contratoProyecto",
        "contratoProyecto.anexos",
      ],
      order: { [orden]: "ASC" },
      skip,
      take: limit,
    });

    return res.status(200).json({
      data: proyectos,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        orden,
        filtro: filtro ?? "todos",
      },
    });

  } catch (error) {
    console.error("[getAllProyectos]", error);
    return res.status(500).json({ status: "error", message: "Error interno del servidor." });
  }
}












/*
 * Cambia el estado de un proyecto a "inactivo" y todas sus cuadrillas a "inactiva".
 *
 * Recibe:
 *   params: { id_proyecto (int) }
 *   token:  { id_trabajador, tipo_usuario }  <- via authMiddleware
 *
 * Retorna 200:
 *   {
 *     status:  "success",
 *     message: "Proyecto inactivado exitosamente."
 *   }
 */
export async function inactivarProyecto(req, res) {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const { id_proyecto } = req.proyectoValidado;

    // Paso 1: inactivar todas las cuadrillas del proyecto
    await queryRunner.manager
      .getRepository(CuadrillaSchema)
      .update({ id_proyecto }, { estado: "inactiva" });

    // Paso 2: inactivar el proyecto
    await queryRunner.manager
      .getRepository(ProyectoSchema)
      .update({ id_proyecto }, { estado: "inactivo" });

    await queryRunner.commitTransaction();

    return res.status(200).json({
      status:  "success",
      message: "Proyecto inactivado exitosamente.",
    });

  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error("[inactivarProyecto]", error);
    return res.status(500).json({ status: "error", message: "Error interno del servidor." });
  } finally {
    await queryRunner.release();
  }
}













/*
 * Cambia el estado de un proyecto a "activo".
 *
 * Recibe:
 *   params: { id_proyecto (int) }
 *   token:  { id_trabajador, tipo_usuario }  <- via authMiddleware
 *
 * Retorna 200:
 *   {
 *     status:  "success",
 *     message: "Proyecto reactivado exitosamente."
 *   }
 */
export async function reactivarProyecto(req, res) {
  try {
    const { id_proyecto } = req.proyectoValidado;

    await proyectoRepo.update({ id_proyecto }, { estado: "activo" });

    return res.status(200).json({
      status:  "success",
      message: "Proyecto reactivado exitosamente.",
    });

  } catch (error) {
    console.error("[reactivarProyecto]", error);
    return res.status(500).json({ status: "error", message: "Error interno del servidor." });
  }
}











/*
 * Cambia el supervisor asignado a un proyecto.
 *
 * Recibe:
 *   body:  { id_proyecto (int), id_trabajador (int) }
 *   token: { id_trabajador, tipo_usuario }  <- via authMiddleware
 *
 * Retorna 200:
 *   {
 *     status:  "success",
 *     message: "Supervisor actualizado exitosamente."
 *   }
 */
export async function cambiarSupervisorProyecto(req, res) {
  try {
    const { id_proyecto }              = req.proyectoValidado;
    const { id_trabajador: id_supervisor } = req.supervisorValidado;

    await proyectoRepo.update({ id_proyecto }, { id_supervisor });

    return res.status(200).json({
      status:  "success",
      message: "Supervisor actualizado exitosamente.",
    });

  } catch (error) {
    console.error("[cambiarSupervisorProyecto]", error);
    return res.status(500).json({ status: "error", message: "Error interno del servidor." });
  }
}








/*
 * Actualiza campos generales de un proyecto.
 *
 * Recibe:
 *   params: { id_proyecto (int) }
 *   body:   {
 *     nombre_proyecto              (string, opcional),
 *     tipo_instalacion             (string, opcional),
 *     direccion                    (string, opcional),
 *     nivel_exigencia              (string, opcional),
 *     cantidad_personal_requerido  (int,    opcional)
 *   }
 *   token: { id_trabajador, tipo_usuario }  <- via authMiddleware
 *
 * Retorna 200:
 *   {
 *     status:  "success",
 *     message: "Proyecto actualizado exitosamente.",
 *     data: { ...proyecto actualizado }
 *   }
 */
export async function actualizarProyecto(req, res) {
  try {
    const { id_proyecto }   = req.proyectoValidado;
    const campos            = req.camposActualizados;

    await proyectoRepo.update({ id_proyecto }, campos);

    const proyectoActualizado = await proyectoRepo.findOne({
      where: { id_proyecto },
    });

    return res.status(200).json({
      status:  "success",
      message: "Proyecto actualizado exitosamente.",
      data:    proyectoActualizado,
    });

  } catch (error) {
    console.error("[actualizarProyecto]", error);
    return res.status(500).json({ status: "error", message: "Error interno del servidor." });
  }
}







/*
 * Establece id_supervisor en null en un proyecto inactivo.
 *
 * Recibe:
 *   params: { id_proyecto (int) }
 *   token:  { id_trabajador, tipo_usuario }  <- via authMiddleware
 *
 * Retorna 200:
 *   {
 *     status:  "success",
 *     message: "Supervisor removido del proyecto exitosamente."
 *   }
 */
export async function removerSupervisorDeProyecto(req, res) {
  try {
    const { id_proyecto } = req.proyectoValidado;

    await proyectoRepo.update({ id_proyecto }, { id_supervisor: null });

    return res.status(200).json({
      status:  "success",
      message: "Supervisor removido del proyecto exitosamente.",
    });

  } catch (error) {
    console.error("[removerSupervisorDeProyecto]", error);
    return res.status(500).json({ status: "error", message: "Error interno del servidor." });
  }
}















/*
 * getMiProyectoBySupervisor
 * Retorna el proyecto al cual el supervisor autenticado pertenece.
 *
 * Recibe:
 *   token: { id_trabajador, tipo_usuario }  <- via authMiddleware
 *
 * Retorna 200:
 *   {
 *     data: {
 *       id_proyecto,
 *       id_cliente,
 *       id_supervisor,
 *       nombre_proyecto,
 *       tipo_instalacion,
 *       direccion,
 *       nivel_exigencia,
 *       cantidad_personal_requerido,
 *       fecha_creacion,
 *       estado
 *     }
 *   }
 */
export async function getMiProyectoBySupervisor(req, res) {
  try {
    // ── Validación 1: solo supervisor ─────────────────────────────────────────
    if (req.user?.tipo_usuario !== "supervisor") {
      return res.status(403).json({
        status:  "error",
        message: "Solo un supervisor puede consultar su proyecto asignado.",
      });
    }

    // ── Validación 2: debe existir un proyecto con este supervisor ────────────
    const proyecto = await proyectoRepo.findOne({
      where: { id_supervisor: req.user.id_trabajador },
    });

    if (!proyecto) {
      return res.status(404).json({
        status:  "error",
        message: "No se encontró un proyecto asociado a tu usuario como supervisor.",
      });
    }

    return res.status(200).json({ data: proyecto });

  } catch (error) {
    console.error("[getMiProyectoBySupervisor]", error);
    return res.status(500).json({ status: "error", message: "Error interno del servidor." });
  }
}