// routes/asignacion.routes.js
"use strict";

import { Router } from "express";
import { getMisAsignaciones } from "../controllers/asignacion.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authMiddleware);

// Trabajador o supervisor autenticado: ve su propia asignación actual + historial
router.get("/mias", getMisAsignaciones);

export default router;