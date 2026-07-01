"use strict";

import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";

import {
  getContratosProyecto,
  getContratoProyectoDetalle,
  crearContratoProyecto,
  actualizarContratoProyecto,
  eliminarContratoProyecto,
  getProyectosSinContrato,
} from "../controllers/contrato_proyecto.controller.js";

import {
  getAnexosByContrato,
  crearAnexo,
  eliminarAnexo,
} from "../controllers/anexo_contrato_proyecto.controller.js";

const router = Router();

router.use(authMiddleware); // Verifica login - agrega info de quien consulta al request

// Solo Administrador (validado dentro de cada controller, mismo patron que proyecto.controller.js)
router.get("/", getContratosProyecto); // Lista paginada de contratos de proyecto (filtros: estado, search)
router.post("/", crearContratoProyecto); // Crea el contrato de un proyecto (1 a 1, requiere que el proyecto no tenga contrato aun)
router.get("/proyectos-disponibles", getProyectosSinContrato); // Proyectos activos sin contrato (para el selector del modal). Debe ir ANTES de "/:id".
router.get("/:id", getContratoProyectoDetalle); // Detalle de un contrato de proyecto, incluye sus anexos
router.patch("/:id", actualizarContratoProyecto); // Actualiza campos del contrato
router.delete("/:id", eliminarContratoProyecto); // Elimina el contrato junto a sus anexos (cascada manual)

router.get("/:id_contrato_proyecto/anexos", getAnexosByContrato); // Lista los anexos de un contrato
router.post("/:id_contrato_proyecto/anexos", crearAnexo); // Crea un anexo (extension/modificacion) para un contrato
router.delete("/anexos/:id_anexo", eliminarAnexo); // Elimina un anexo puntual

export default router;