import { Router } from "express";
import {
  getEtiquetas,
  getEtiquetaById,
  crearEtiqueta,
  actualizarEtiqueta,
  eliminarEtiqueta,
  asignarEtiqueta,
} from "../controllers/etiqueta.controller.js";
// import { authenticateToken, requireAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

// Lectura: cualquier usuario autenticado
router.get("/", /* authenticateToken, */ getEtiquetas);
router.get("/:id", /* authenticateToken, */ getEtiquetaById);

// Escritura: solo administradores
router.post("/", /* authenticateToken, requireAdmin, */ crearEtiqueta);
router.put("/:id", /* authenticateToken, requireAdmin, */ actualizarEtiqueta);
router.delete("/:id", /* authenticateToken, requireAdmin, */ eliminarEtiqueta);

// Asignar o quitar etiqueta a un trabajador: solo administradores
// Body: { id_trabajador, id_etiqueta }  (id_etiqueta: null para quitar)
router.patch("/asignar", /* authenticateToken, requireAdmin, */ asignarEtiqueta);

export default router;