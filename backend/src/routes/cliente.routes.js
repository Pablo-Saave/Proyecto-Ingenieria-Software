"use strict";

import { Router } from "express";

import {
  getClientes,
  crearCliente,
  actualizarCliente,
  eliminarCliente,
} from "../controllers/cliente.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { autorizar } from "../middlewares/autorizar.middleware.js";
import {
  validarCrearCliente,
  validarActualizarCliente,
} from "../validations/cliente.validation.js";

const router = Router();

// Antes: ninguna ruta pedia sesion. Ahora, todo este archivo exige login.
router.use(authMiddleware);

router.get("/", autorizar("clientes:ver"), getClientes);
router.post("/", autorizar("clientes:crear"), validarCrearCliente, crearCliente);
router.put("/:id", autorizar("clientes:editar"), validarActualizarCliente, actualizarCliente);
router.delete("/:id", autorizar("clientes:eliminar"), eliminarCliente);

export default router;