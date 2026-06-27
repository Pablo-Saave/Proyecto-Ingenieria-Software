import { Router } from "express";
import {
  getEtiquetas,
  getEtiquetaById,
  crearEtiqueta,
  actualizarEtiqueta,
  eliminarEtiqueta,
  asignarEtiqueta,
} from "../controllers/etiqueta.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { autorizar } from "../middlewares/autorizar.middleware.js";

const router = Router();

router.use(authMiddleware);

// cualquier usuario autenticado
router.get("/", getEtiquetas);
router.get("/:id", getEtiquetaById);

// solo administradores
router.post("/", autorizar("etiquetas:gestionar"), crearEtiqueta);
router.put("/:id", autorizar("etiquetas:gestionar"), actualizarEtiqueta);
router.delete("/:id", autorizar("etiquetas:gestionar"), eliminarEtiqueta);

router.patch("/asignar", autorizar("etiquetas:gestionar"), asignarEtiqueta);

export default router;
