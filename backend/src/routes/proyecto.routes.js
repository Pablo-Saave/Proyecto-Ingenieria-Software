"use strict";

import { Router } from "express";
import { autorizar } from "../middlewares/autorizar.middleware.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { validarCrearProyecto } from "../validations/proyectos.validation.js";

import {
  getProyectos,
  crearProyecto,
  actualizarProyecto,
  getMyProyectosByToken,
  getProyectData,
  inactivarProyecto,
  reactivarProyecto,
  crearProyectoQuickFix
} from "../controllers/proyecto.controller.js";


const router = Router();

router.use(authMiddleware); // Verifica Login - Agrega info de quien consulta y permisos al request

// Administrador
/* LISTO */ //router.post("/", crearProyecto); // Crea un nuevo Proyecto (Recibe id_cliente, nombre_proyecto, tipo_instalacion, direccion, nivel_exigencia, cantidad_personal_requerido) (Validacion 1: El que crea el proyecto debe tener tipo_usuario = administrador) (Validacion 2: El cliente id_cliente debe existir) (Validacion 3: Los campos no deben estar vacios)
/* LISTO */ router.get("/", getProyectos); // Devuelve Lista de proyectos,(junto con informacion de su respectivo cliente) [paginados y ordenados (orden por fecha (por defecto), orden alfabetico nombre_proyecto opcional debe especificarse)] (Validacion 1: El que hace la peticion debe tener tipo_usuario = administrador)
/* LISTO */ router.patch("/:id_proyecto", actualizarProyecto); // Actualiza los datos de un proyecto  (Puede ser nombre_proyecto, tipo_instalacion, direccion, nivel_exigencia, cantidad_personal_requerido) (Validacion 1: El que hace la peticion debe tener tipo_usuario = administrador) (Validacion 2: El proyecto a actualizar debe existir) (Validacion 3: La peticion debe contener al menos un campo a actualizar)
/* LISTO */ router.delete("/inactivar/:id", inactivarProyecto); // Cambia el estado de Proyecto a "inactivo", en cascada cambia el estado de todas sus cuadrillas a "inactiva". (Validacion 1: El que realiza la peticion debe tener tipo_usuario = administrador) (Validacion 2: Si en la cascada una cuadrilla ya se encontraba inactiva, dejarla asi)
/* LISTO */ router.patch("/reactivar/:id", reactivarProyecto); // Solo cambia el estado de Proyecto a "activo". (Validacion 1: El que realiza la peticion debe tener tipo_usuario = administrador) (Validacion 2: El proyecto debe existir)

// Trabajador & Supervisor
/* LISTO */router.get("/misProyectos", getMyProyectosByToken); // Obtiene una lista paginada de los proyectos a los que pertenece un trabajador, en base a un id_trabajador proveido en el token.
/* LISTO */router.get("/:id", getProyectData); // Informacion detallada del proyecto al clikearlo (Validar que pertenezca al proyecto || Sea Admin)


/*Ajustar luego*/ router.post("/", authMiddleware, validarCrearProyecto, crearProyectoQuickFix); // Crea un nuevo Proyecto (Recibe id_cliente, id_supervisor, nombre_proyecto, tipo_instalacion, direccion, nivel_exigencia, cantidad_personal_requerido) (Validacion 1: El que crea el proyecto debe tener tipo_usuario = administrador) (Validacion 2: El cliente id_cliente debe existir) (Validacion 3: El trabajador cuyo id_trabajador es id_supervisor debe existir) (Validacion 4: El trabajador cuyo id_trabajador es id_supervisor debe tener tipo_usuario = supervisor) (Validacion 4: El trabajador cuyo id_trabajador es id_supervisor no debe formar parte de otro proyecto (supervisar otro proyecto)) (Validacion 5: Los campos no deben estar vacios)


export default router;