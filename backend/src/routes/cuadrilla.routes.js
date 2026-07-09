"use strict";

import { Router } from "express";

import {
    crearCuadrilla,
    deleteCuadrilla,
    agregarTrabajadorCuadrilla,
    eliminarTrabajadorCuadrilla,
    getMiCuadrilla,
    getAllCuadrillasAndWorkersByIdProyecto,
    getMyCuadrillasAndWorkersFromIdProyecto,
    getIntegrantesOfCuadrilla,
    editarNombreCuadrilla,
    getCuadrillaData,
    getMyCuadrillasAndIntegrantesFromToken,
    inactivarCuadrilla,
    reactivarCuadrilla
} from "../controllers/cuadrilla.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(authMiddleware);

// ADMINISTRADOR

router.post("/", crearCuadrilla);
router.patch("/cambiarNombre/", editarNombreCuadrilla);
router.patch("/reactivar/", reactivarCuadrilla);
router.post("/trabajador", agregarTrabajadorCuadrilla);
router.delete("/inactivar/", inactivarCuadrilla);
router.delete("/trabajador", eliminarTrabajadorCuadrilla);
router.delete("/:id", deleteCuadrilla);
router.get("/cuadrillas/:id_proyecto", getAllCuadrillasAndWorkersByIdProyecto);

// SUPERVISOR / TRABAJADOR

router.get("/misCuadrillas/:id_proyecto", getMyCuadrillasAndWorkersFromIdProyecto);
router.get("/verIntegrantes/:id_cuadrilla", getIntegrantesOfCuadrilla);
router.get("/miCuadrilla", getMiCuadrilla);
router.get("/:id_cuadrilla", getCuadrillaData);

// SUPERVISOR

router.get("/supervisor/misCuadrillasAndIntegrantes", getMyCuadrillasAndIntegrantesFromToken);

export default router;