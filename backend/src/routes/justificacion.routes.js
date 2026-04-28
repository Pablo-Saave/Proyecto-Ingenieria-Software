import { Router } from "express";
import {
  crearJustificacion,
  obtenerJustificaciones
} from "../controllers/justificacion.controller.js";

const router = Router();

router.post("/", crearJustificacion);
router.get("/", obtenerJustificaciones);

export default router;