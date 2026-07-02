// routes/notificacion.routes.js
import { Router } from "express";
import {
  getNotificaciones,
  getContadorNoLeidas,
  marcarLeida,
  marcarTodasLeidas,
} from "../controllers/notificacion.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(authMiddleware);

router.get("/", getNotificaciones);
router.get("/no-leidas/count", getContadorNoLeidas);
router.patch("/leer-todas", marcarTodasLeidas);
router.patch("/:id_notificacion/leer", marcarLeida);

export default router;