"use strict";

import { Router } from "express";

import {
    crearCuadrilla,
    deleteCuadrilla,
    agregarSupervisorCuadrilla,
    eliminarSupervisorCuadrilla,
    agregarTrabajadorCuadrilla,
    eliminarTrabajadorCuadrilla,
    getMiCuadrilla,
    getAllCuadrillasAndWorkersByIdProyecto,
    getMyCuadrillasAndWorkersFromIdProyecto,
    getIntegrantesOfCuadrilla,
    reactivarCuadrilla,
    editarNombreCuadrilla,
    getCuadrillaData,
    asignarBodeguero,
    despojarBodeguero,
    getMyCuadrillasAndIntegrantesFromToken,
    inactivarCuadrilla
} from "../controllers/cuadrilla.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authMiddleware); // Esto valida el tipo de usuario //

// Administrador

router.delete("/inactivar/", authMiddleware, inactivarCuadrilla); // Cambia el estado de una cuadrilla a "inactiva" soft delete. (recibe id_cuadrilla) (Validacion 1: El que realiza la peticion debe tener tipo_usuario = administrador) (Validacion 2: La cuadrilla debe existir) (Validacion 3: El proyecto al cual pertenece la cuadrilla debe tener estado = activo) (Validacion 4: La cuadrilla no debe estar inactiva)
router.patch("/reactivar/", authMiddleware, reactivarCuadrilla); // Cambia el estado de una cuadrilla a "activa" (recibe id_cuadrilla) (Validacion 1: El que realiza la peticion debe tener tipo_usuario = administrador) (Validacion 2: La cuadrilla debe existir) (Validacion 3: El proyecto del cual la cuadrilla pertenece debe estar activo) (Validacion 4: La cuadrilla no debe esar ya "activa")


/* LISTO - VALIDACION ESTADO PROYECTO y CUADRILLA */router.post("/", crearCuadrilla); // Crea Cuadrilla de proyecto (recibe id_proyecto, nombrecuadrilla, estado) (Validacion 1: El que crea la cuadrilla debe tener tipo_usuario = administrador) (Validacion 2: El proyecto debe estar activo) (Validacion 3: id_proyecto debe existir) (Validacion 4: Los campos no pueden estar vacios)
/* LISTO - VALIDACION ESTADO PROYECTO y CUADRILLA */ router.delete("/supervisor", eliminarSupervisorCuadrilla); // Eliminar supervisor de cuadrilla (Validacion 1: el que realiza la peticion debe tener tipo_usuario = administrador) (Validacion 2: El id_trabajador a eliminar debe tener tipo_usuario = supervisor) (Validacion 3: Tanto el supervisor como la cuadrilla a la que pertenece deben existir) (Validacion 4: El supervisor a eliminar debe pertenecer a la cuadrilla especificada)
/* LISTO - VALIDACION ESTADO PROYECTO y CUADRILLA */ router.delete("/trabajador", eliminarTrabajadorCuadrilla); // Eliminar trabajador de cuadrilla (recibe id_trabajador, id_cuadrilla) (Validacion 1: El que realiza la peticion debe tener tipo_usuario = administrador o tipo_usuario = supervisor y si es supervisor debe pertenecer a la cuadrilla de la cual se eliminara el trabajador) (Validacion 2: El trabajador a eliminar no puede tener tipo_usuario = supervisor) (Validacion 3: El trabajador a eliminar debe pertenecer a la cuadrilla de la cual se esta eliminando) (Validacion 4: La cuadrilla de la cual se eliminara el trabajador debe existir) (Validacion 5: El proyecto de la cuadrilla debe tener estado "activo") (Validacion 6: La cuadrilla debe tener estado "activa")
/* LISTO - VALIDACION ESTADO PROYECTO y CUADRILLA*/ router.delete("/:id", authMiddleware, deleteCuadrilla); // Cambia el estado de una cuadrilla a "inactiva" soft delete. (recibe id_cuadrilla) (Validacion 1: El que realiza la peticion debe tener tipo_usuario = administrador) (Validacion 2: La cuadrilla debe existir) (Validacion 3: El proyecto al cual pertenece la cuadrilla debe tener estado = activo) (Validacion 4: La cuadrilla no debe estar inactiva)
/* LISTO - VALIDACION ESTADO PROYECTO Y CUADRILLA */router.patch("/cambiarNombre/", editarNombreCuadrilla); // Edita el nombre de una cuadrilla. (recibe id_cuadrilla) (Validacion 1: El que realiza la peticion debe tener tipo_usuario = administrador) (Validacion 2: La cuadrilla debe existir) (Validacion 3: El proyecto del cual la cuadrilla pertenece debe estar activo) (Validacion 4: La cuadrilla a editar debe estar "activa")
/* LISTO - VALIDACION ESTADO PROYECTO Y CUADRILLA */ router.post("/supervisor", agregarSupervisorCuadrilla); // Agregar supervisor a cuadrilla (recibe id_trabajador, id_cuadrilla) (validacion 1: el que realiza la peticion post debe tener tipo_usuario = administrador) (validacion 2: El id_trabajador a agregar no puede tener tipo_usuario = trabajador o tipo_usuario = administrador) (validacion 3: El supervisor a agregar no puede existir ya en la cuadrilla) (Validacion 4: El proyecto de la cuadrilla debe estar "activo") (Validacion 5: La cuadrilla debe estar "activa")
// Administrador UX
/* LISTO - VALIDACION ESTADO PROYECTO Y CUADRILLA */ router.get("/cuadrillas/:id_proyecto", getAllCuadrillasAndWorkersByIdProyecto);// - Ver Cuadrillas de un proyecto, recibe una lista con informacion de cuadrillas y sus integrantes. (dar id proyecto, recibir lista ids de cuadrillas) (Validacion 1: El que realiza la consutla debe tener tipo_usuario = administrador) (Validacion 2: El proyecto debe existir) (Validacion 3: El proyecto debe estar activo)



// Supervisor (o administrador)
/* LISTO - VALIDACION ESTADO PROYECTO Y CUADRILLA */ router.post("/trabajador", agregarTrabajadorCuadrilla); // Agregar trabajador a cuadrilla (recibe id_trabajador, id_cuadrilla) (Validacion 1: el que realiza la peticion post debe tener tipo_usuario = administrador, o tipo_usuario = supervisor y si es supervisor debe pertenecer a la cuadrilla a la cual se agregara el trabajador) (Validacion 2: El id_trabajador a agregar no puede tener tipo_usuario = supervisor o tipo_usuario = administrador) (Validacion 3: El trabajador a agregar no puede existir ya en la cuadrilla) (Validacion 4: El proyecto debe tener estado activo) (Validacion 5: La cuadrilla debe tener estado activa) (Validacion 6: Todos los campos deben venir completos)
/* LISTO - VALIDACION ESTADO PROYECTO Y CUADRILLA */router.post("/bodeguero/", asignarBodeguero); // Asigna un bodeguero a la cuadrilla (Recibe id_trabajador, id_cuadrilla) (Validacion 1: El que realiza la peticion debe tener tipo_usuario = administrador o tipo_usuario = supervisor, si es supervisor debe pertenecer a la cuadrilla) (Validacion 2: El trabajador a asignar como bodeguero debe pertenecer a la cuadrilla) (Validacion 3: El trabajador debe existir) (Validacion 4: El proyecto debe tener estado "activo") (Validacion 5: La cuadrilla debe tener estado "activa") (Validacion 5: El trabajador no debe ser bodeguero)
/* LISTO - VALIDACION ESTADO PROYECTO Y CUADRILLA */ router.delete("/bodeguero/", despojarBodeguero); // Elimina un bodeguero de una cuadrilla (Recibe id_trabajador, id_cuadrilla) (Validacion 1: El que realiza la peticion debe tener tipo_usuario = administrador o tipo_usuario = supervisor, si es supervisor debe pertenecer a la cuadrilla) (Validacion 2: El trabajador a despojar como bodeguero debe pertenecer a la cuadrilla) (Validacion 3: El trabajador debe existir) (Validacion 4: El proyecto debe tener estado "activo") (Validacion 5: La cuadrilla debe tener estado "activa") (Validacion 5: El trabajador debe ser bodeguero)

// Trabajador & Supervisor
/* LISTO - VALIDACION ESTADO PROYECTO Y CUADRILLA */ router.get("/misCuadrillas/:id_proyecto" , getMyCuadrillasAndWorkersFromIdProyecto); // Token // - Dado un id_proyecto, ver cuadrillas a las que pertenece un id_trabajador. (dar id_proyecto desde url y id_trabajador mediante token, recibir lista con cuadrillas a las que pertenece)
/* LISTO - VALIDACION ESTADO PROYECTO Y CUADRILLA */ router.get("/verIntegrantes/:id_cuadrilla", getIntegrantesOfCuadrilla); // - Retorna lista de integrantes (id_trabajador, nombres, apellidos, cargo_operativo, tipo_jornada, es_bodeguero, fecha_asignacion) de una cuadrilla especifica (Validacion 1: El que realiza la peticion debe ser administrador o pertenecer a la cuadrilla) (Validacion 2: La cuadrilla debe existir)
router.get("/miCuadrilla", authMiddleware, getMiCuadrilla);
/* LISTO - VALIDACION ESTADO PROYECTO Y CUADRILLA */ router.get("/:id_cuadrilla", getCuadrillaData); // Retorna la informacion de una cuadrilla (Recibe id_cuadrilla) (Validacion 1: El que realiza la peticion debe tener tipo_usuario = administrador o pertenecer a la cuadrilla que esta solicitando informacion) (Validacion 2: La cuadrilla id_cuadrilla debe existir)


router.get("/supervisor/misCuadrillasAndIntegrantes", authMiddleware, getMyCuadrillasAndIntegrantesFromToken); // Retorna una lista de cuadrillas(todos sus atributos, cuadrillas ordenadas alfabeticamente por nombre_cuadrilla), y cada cuadrilla con una lista de sus integrantes (integrantes ordenados alfabeticamente segun su apellidos), de cada integrante (id_trabajador, rut, nombres, apellidos, telefono, correo, direccion, fecha_nacimiento, fecha_ingreso, estado_laboral, cargo_operativo, tipo_jornada, fecha_asignacion). (Validacion 1: El id_trabajador entregado mediante el token, debe coincidir con el atributo id_supervisor del Proyecto)




export default router;