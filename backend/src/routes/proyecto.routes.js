"use strict";

import { Router } from "express";
import { autorizar } from "../middlewares/autorizar.middleware.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

import {
  validarActualizarProyecto,
  validarCambiarSupervisorProyecto,
  validarCrearProyecto,
  validarInactivarProyecto,
  validarReactivarProyecto,
  validarRemoverSupervisorDeProyecto
} from "../validations/proyectos.validation.js";

import {
  crearProyecto,
  actualizarProyecto,
  inactivarProyecto,
  reactivarProyecto,
  getAllProyectos,
  cambiarSupervisorProyecto,
  removerSupervisorDeProyecto,
  getMiProyectoBySupervisor
} from "../controllers/proyecto.controller.js";


const router = Router();

router.use(authMiddleware); // Verifica Login - Agrega info de quien consulta y permisos al request

// Administrador
router.post("/", authMiddleware, validarCrearProyecto, crearProyecto); // Crea un nuevo Proyecto (Recibe id_cliente, id_supervisor, nombre_proyecto, tipo_instalacion, direccion, nivel_exigencia, cantidad_personal_requerido) (Validacion 1: El que crea el proyecto debe tener tipo_usuario = administrador) (Validacion 2: El cliente id_cliente debe existir) (Validacion 3: El trabajador cuyo id_trabajador es id_supervisor debe existir) (Validacion 4: El trabajador cuyo id_trabajador es id_supervisor debe tener tipo_usuario = supervisor) (Validacion 4: El trabajador cuyo id_trabajador es id_supervisor no debe formar parte de otro proyecto (supervisar otro proyecto)) (Validacion 5: Los campos no deben estar vacios)
router.get("/", authMiddleware, getAllProyectos); // (Entrega mediante su token trabajador_id) Retorna una lista de todos los proyectos del sistema, cada proyecto viene junto con informacion de su cliente, sus inventarios, y su informacion de contrato_proyecto junto a sus anexos, de la forma {"data": [.., {..proyecto, cliente: {..}, inventarios: [..], contrato_proyecto: {.., [..anexos_contrato_proyecto]}}], "meta": {total, page, limit, totalPages, orden, filtro}} (proyectos paginados y ordenados, orden alfabetico por nombre_proyecto por defecto, orden por fecha_creacion opcional, por defecto muestra todos los proyectos, pero permite filtro por estado_proyecto "activo" o "inactivo"). (Validacion 1: El que realiza la peticion debe tener en su token tipo_usuario = administrador)
router.delete("/inactivar/:id_proyecto", authMiddleware, validarInactivarProyecto, inactivarProyecto); // Cambia el estado de un proyecto a inactivo, y el estado de sus cuadrillas a inactiva. (Recibe un id_proyecto) (Validacion 1: El id_proyecto debe existir) (Validacion 2: El proyecto debe estar activo) (Validacion 3: El que realiza la peticion debe tener tipo_usuario = administrador)
router.patch("/reactivar/:id_proyecto", authMiddleware, validarReactivarProyecto, reactivarProyecto) //   Solo cambia el estado de un proyecto a activo. (Recibe un id_proyecto) (Validacion 1: El id_proyecto debe existir) (Validacion 2: El proyecto debe estar inactivo) (Validacion 3: El que realiza la peticion debe tener tipo_usuario = administrador) (Validacion 4: El id_supervisor del proyecto a reactivar tiene que ser diferente de null)
router.patch("/supervisor/", validarCambiarSupervisorProyecto, cambiarSupervisorProyecto); // Cambia el id_supervisor de un proyecto, por el valor de un id_trabajador entregado en el body de la consulta (Recibe {id_proyecto, id_trabajador}) (Validacion 1: El id_proyecto debe existir) (Validacion 2: El id_trabajador debe existir) (Validacion 3: El id_trabajador debe tener tipo_usuario = supervisor) (Validacion 4: El id_trabajador no debe estar presente en el atributo id_supervisor de otro proyecto) (Validacion 5: El que realiza la peticion debe tener tipo_usuario = administrador)
router.patch("/:id_proyecto", validarActualizarProyecto, actualizarProyecto); // Cambia datos generales del proyecto (Recibe {nombre_proyecto, tipo_instalacion, direccion, nivel_exigencia, cantidad_personal_requerido})  (Validacion 1: El id_proyecto debe existir) (Validacion 2: El proyecto debe estar activo) (Validacion 3: Se debe entregar al menos un campo a modificar) (Validacion 4: El que realiza la peticion debe tener tipo_usuario = administrador)
router.delete("/supervisor/:id_proyecto", validarRemoverSupervisorDeProyecto, removerSupervisorDeProyecto); // Elimina el supervisor de un proyecto inactivo (Recibe token de autenticacion) (Validacion 1: El que realiza la consulta debe tener tipo_usuario = administrador) (Validacion 2: El proyecto debe existir) (Validacion 3: El proyecto debe tener estado = inactivo) (Validacion 4: El campo no puede estar vacio) (Validacion 5: El id_supervisor del proyecto debe ser distinto de null)


// Supervisor
router.get("/supervisor/miProyecto/", authMiddleware, getMiProyectoBySupervisor); // Obtiene informacion del proyecto al cual el supervisor pertenece (Recibe {"data": {toda la tupla de proyecto} }) (Validacion 1: El que realiza la consulta debe tener tipo_usuario = supervisor) (Validacion 2: El id_trabajador del que realiza la consulta debe estar presente en el atributo id_supervisor de algun proyecto)

export default router;