import { Router } from "express";
import {
  crearAusencia,
  eliminarAusencia,
  obtenerAusencias,
  obtenerAusenciasPendientes,
  obtenerAusenciasPorTrabajador,
  revisarAusencia
} from "../controllers/ausencia.controller.js";

import {
  validarCrearAusencia,
  validarRevisionAusencia,
} from "../validations/ausencia.validation.js";

const router = Router();

// POST crear ausencia con su respectiva validacion
router.post("/", validarCrearAusencia, crearAusencia);

router.get("/", obtenerAusencias);
router.get("/trabajador/:id", obtenerAusenciasPorTrabajador);
router.get("/pendientes", obtenerAusenciasPendientes);

// DELETE CONSULTA

router.delete('/:id', eliminarAusencia);

// PUT gestionar ausencia con su respectiva validacion
router.put("/:id/revisar", validarRevisionAusencia, revisarAusencia); //id de la ausencia

export default router;