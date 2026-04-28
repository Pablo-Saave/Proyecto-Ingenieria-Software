import { Router } from "express";
import {
    getPermisos,
    crearPermiso,
} from "../controllers/permiso.controller.js";

const router = Router();

router.get("/", getPermisos);
router.post("/", crearPermiso);

export default router;