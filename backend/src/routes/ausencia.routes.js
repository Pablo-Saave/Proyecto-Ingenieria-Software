import { Router } from "express";
import {
  crearAusencia,
  obtenerAusencias,
  obtenerAusenciasPorTrabajador
} from "../controllers/ausencia.controller.js";

const router = Router();

router.post("/", crearAusencia);
router.get("/", obtenerAusencias);
router.get("/trabajador/:id", obtenerAusenciasPorTrabajador);

export default router;