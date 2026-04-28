import { Router } from "express";

import {
    getRoles,
    crearRol,
} from "../controllers/rol.controller.js";

const router = Router();

router.get("/", getRoles);
router.post("/", crearRol);

export default router;