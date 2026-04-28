import { Router } from "express";
import {
  crearAsignado,
  obtenerAsignados,
  obtenerAsignadosPorTrabajador
} from "../controllers/asignado.controller.js";

const router = Router();

router.post("/", crearAsignado);
router.get("/", obtenerAsignados);
router.get("/trabajador/:id", obtenerAsignadosPorTrabajador);

export default router;