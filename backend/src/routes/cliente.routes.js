"use strict";

import { Router } from "express";

import {
  getClientes,
  crearCliente,
  eliminarCliente,
} from "../controllers/cliente.controller.js";

const router = Router();

router.get("/", getClientes);
router.post("/", crearCliente);
router.delete("/:id", eliminarCliente);

export default router;