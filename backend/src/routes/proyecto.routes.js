"use strict";

import { Router } from "express";

import {
  getProyectos,
  crearProyecto,
  actualizarProyecto,
  eliminarProyecto,
} from "../controllers/proyecto.controller.js";

const router = Router();

router.get("/", getProyectos);
router.post("/", crearProyecto);
router.patch("/:id", actualizarProyecto);
router.delete("/:id", eliminarProyecto);

export default router;