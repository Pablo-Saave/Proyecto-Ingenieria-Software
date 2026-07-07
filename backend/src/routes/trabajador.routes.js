import { Router } from "express";
import {
  getAllTrabajadores,
  getTrabajadorById,
  createTrabajador,
  updateTrabajador,
  deleteTrabajador,
  getAllTrabajadoresSinCuadrilla,
  getAllSupervisoresSinProyecto
} from "../controllers/trabajador.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { autorizar } from "../middlewares/autorizar.middleware.js";
import {
  validarCrearTrabajador,
  validarActualizarTrabajador,
} from "../validations/trabajador.validation.js";

const router = Router();

// Antes: ninguna ruta de este archivo pedia sesion. Ahora, todas la exigen.
router.use(authMiddleware);

// Solo supervisor y administrador tienen 'trabajadores:ver' (revisa
// configPermisos.js) -- un trabajador normal no puede listar a otros.
router.get("/", autorizar("trabajadores:ver"), getAllTrabajadores);

/* Para Kevin, ajustar rutas despues */
// Estas dos ya validan "administrador" DENTRO del controller (hardcodeado,
// no via permisos) -- se deja asi por ahora para no tocar 2 archivos a la vez.
router.get("/sinCuadrilla/", getAllTrabajadoresSinCuadrilla);
router.get("/supervisoresSinProyecto/", getAllSupervisoresSinProyecto);

router.get("/:id", autorizar("trabajadores:ver"), getTrabajadorById);

router.post("/", autorizar("trabajadores:crear"), validarCrearTrabajador, createTrabajador);
router.put("/:id", autorizar("trabajadores:editar"), validarActualizarTrabajador, updateTrabajador);
router.delete("/:id", autorizar("trabajadores:eliminar"), deleteTrabajador);

export default router;