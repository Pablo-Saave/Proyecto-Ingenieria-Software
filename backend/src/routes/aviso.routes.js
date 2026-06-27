// routes/aviso.routes.js
import { Router } from "express";
import {
  crearAviso,
  eliminarAviso,
  getAvisosMiUnidad,
  getTodosLosAvisos,
  getEtiquetas,
} from "../controllers/aviso.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { autorizar }      from "../middlewares/autorizar.middleware.js";

const router = Router();
router.use(authMiddleware);

// Todos los roles autenticados
router.get("/mi-unidad",  autorizar("canales:ver"),      getAvisosMiUnidad);

// Solo administrador
router.get("/todas",      autorizar("canales:ver_todas"), getTodosLosAvisos);
router.get("/etiquetas",  autorizar("canales:ver_todas"), getEtiquetas);
router.delete("/:id",     autorizar("canales:eliminar"),  eliminarAviso);

// Supervisor y administrador
router.post("/",          autorizar("canales:publicar"),  crearAviso);

export default router;