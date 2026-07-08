"use strict";

import { Router } from "express";

import {
  getRemuneraciones,
  getRemuneracionesPaginadas,
  getRemuneracion,
  getMiRemuneracion,
  crearRemuneracion,
  actualizarRemuneracion,
  eliminarRemuneracion,
  getRemuneracionesAndContratos
} from "../controllers/remuneracion.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { autorizar } from "../middlewares/autorizar.middleware.js";
import { validateActualizarRemuneracion, validateCrearRemuneracion, validateGetRemuneraciones } from "../validations/remuneracion.validation.js";

const router = Router();

// Todas las rutas de remuneraciones requieren estar autenticado
router.use(authMiddleware);

// Supervisor y trabajador: solo su propio pago
router.get("/mi-pago", autorizar("pagos:ver_propios"), getMiRemuneracion);

// Administrador: gestión y visualización de todos los pagos
router.get("/", autorizar("pagos:ver_todos"), getRemuneraciones);
router.get("/paginadas/", autorizar("pagos:ver_todos"), getRemuneracionesPaginadas);
router.post("/get", autorizar("pagos:ver_todos"), getRemuneracion);

// Admin
router.get("/all/", authMiddleware, validateGetRemuneraciones, getRemuneracionesAndContratos);
router.post("/", authMiddleware, validateCrearRemuneracion, crearRemuneracion);
router.patch("/:id_remuneracion", authMiddleware, validateActualizarRemuneracion, actualizarRemuneracion);
router.delete("/:id_remuneracion", authMiddleware, eliminarRemuneracion);


export default router;