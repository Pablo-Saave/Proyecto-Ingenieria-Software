import { Router } from "express";
import {
  getAllTrabajadores,
  getTrabajadorById,
  createTrabajador,
  updateTrabajador,
  deleteTrabajador,
} from "../controllers/trabajador.controller.js";

const router = Router();

router.get("/", getAllTrabajadores);
router.get("/:id", getTrabajadorById);

router.post("/", createTrabajador);
router.put("/:id", updateTrabajador);
router.delete("/:id", deleteTrabajador);

export default router;