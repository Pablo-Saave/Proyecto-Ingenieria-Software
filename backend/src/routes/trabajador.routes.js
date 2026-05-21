import { Router } from "express";
import {
  getAllTrabajadores,
  getTrabajadorById,
  getTrabajadoresByEtiqueta,
  createTrabajador,
  updateTrabajador,
  deleteTrabajador,
} from "../controllers/trabajador.controller.js";

const router = Router();

router.get("/", getAllTrabajadores);
router.get("/etiqueta/:id_etiqueta", getTrabajadoresByEtiqueta);
router.get("/:id", getTrabajadorById);

router.post("/", createTrabajador);
router.put("/:id", updateTrabajador);
router.delete("/:id", deleteTrabajador);

export default router;