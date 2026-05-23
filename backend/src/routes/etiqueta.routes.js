import { Router } from "express";
import {
  getEtiquetas,
  getEtiquetaById,
  crearEtiqueta,
  actualizarEtiqueta,
  eliminarEtiqueta,
  asignarEtiqueta,
} from "../controllers/etiqueta.controller.js";

const router = Router();

// cualquier usuario autenticado
router.get("/", getEtiquetas);
router.get("/:id", getEtiquetaById);

// solo administradores
router.post("/", crearEtiqueta);
router.put("/:id", actualizarEtiqueta);
router.delete("/:id", eliminarEtiqueta);

router.patch("/asignar", /* authenticateToken, requireAdmin, */ asignarEtiqueta);

export default router;