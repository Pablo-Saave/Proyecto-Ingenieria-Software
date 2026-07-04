"use strict";

import { Router } from "express";

import {
  getRemuneraciones,
  crearRemuneracion,
  actualizarRemuneracion,
  eliminarRemuneracion,
  getRemuneracionesPaginadas,
  getRemuneracion,
  getMiRemuneracion,
} from "../controllers/remuneracion.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { autorizar } from "../middlewares/autorizar.middleware.js";

const router = Router();

// Todas las rutas de remuneraciones requieren estar autenticado
router.use(authMiddleware);

// Supervisor y trabajador: solo su propio pago
router.get("/mi-pago", autorizar("pagos:ver_propios"), getMiRemuneracion);

// Administrador: gestión y visualización de todos los pagos
router.get("/", autorizar("pagos:ver_todos"), getRemuneraciones);
router.get("/paginadas/", autorizar("pagos:ver_todos"), getRemuneracionesPaginadas);
router.post("/get", autorizar("pagos:ver_todos"), getRemuneracion);
router.post("/", autorizar("pagos:gestionar"), crearRemuneracion);
router.patch("/:id", autorizar("pagos:gestionar"), actualizarRemuneracion);
router.delete("/:id", autorizar("pagos:gestionar"), eliminarRemuneracion);

export default router;