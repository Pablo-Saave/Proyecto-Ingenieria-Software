"use strict";

import { Router } from "express";

import {
  getRemuneraciones,
  crearRemuneracion,
  actualizarRemuneracion,
  eliminarRemuneracion,
} from "../controllers/remuneracion.controller.js";

const router = Router();

router.get("/", getRemuneraciones);
router.post("/", crearRemuneracion);
router.patch("/:id", actualizarRemuneracion);
router.delete("/:id", eliminarRemuneracion);

export default router;