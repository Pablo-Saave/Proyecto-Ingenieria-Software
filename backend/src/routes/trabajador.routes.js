import { Router } from "express";
import {
  getAllTrabajadores,
  getTrabajadorById,
  createTrabajador,
  updateTrabajador,
  deleteTrabajador,
  getAllTrabajadoresSinCuadrilla
} from "../controllers/trabajador.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", getAllTrabajadores);
router.get("/:id", getTrabajadorById);

router.post("/", createTrabajador);
router.put("/:id", updateTrabajador);
router.delete("/:id", deleteTrabajador);


/* Para Kevin, ajustar rutas despues */
// Administrador
router.get("/sinCuadrilla/", authMiddleware, getAllTrabajadoresSinCuadrilla); // Retorna una lista de trabajadores (su info y los contratos de cada trabajador) que no pertenescan a ninguna cuadrilla, de la forma: {status, data: [{id_trabajador, tipo_usuario, rut, nombres, apellidos, sexo, telefono, correo, direccion, fecha_nacimiento, fecha_ingreso, estado_laboral, experiencia_previa, contratos: [{..contratos}] }]} (Validacion 1: El que realiza la peticion debe tener tipo_usuario administrador) (Validacion 2: Los trabajadores retornados no deben pertenecer a ninguna cuadrilla)

export default router;