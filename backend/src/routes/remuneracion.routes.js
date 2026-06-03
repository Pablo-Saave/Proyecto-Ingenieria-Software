"use strict";

import { Router } from "express";

import {
  getRemuneraciones,
  crearRemuneracion,
  actualizarRemuneracion,
  eliminarRemuneracion,
  getRemuneracionesPaginadas,
  getRemuneracion
} from "../controllers/remuneracion.controller.js";

const router = Router();

router.get("/", getRemuneraciones);
router.get("/paginadas/", getRemuneracionesPaginadas);
router.post("/get", getRemuneracion);
router.post("/", crearRemuneracion);
router.patch("/:id", actualizarRemuneracion);
router.delete("/:id", eliminarRemuneracion);

export default router;