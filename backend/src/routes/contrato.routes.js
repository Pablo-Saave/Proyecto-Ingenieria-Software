// routes/contrato.routes.js
import express from 'express';
import {
  getAllContratos,
  getContratoById,
  createContrato,
  updateContrato,
  deleteContrato,
  getContratosByTrabajador,
  cargarContrato,
} from '../controllers/contrato.controller.js';

import { authMiddleware }  from '../middlewares/auth.middleware.js';
import { autorizar }       from '../middlewares/autorizar.middleware.js';
import {
  validarCrearContrato,
  validarActualizarContrato,
  validarEliminarContrato,
} from '../validations/contratos.validation.js';

const router = express.Router();

// Todas las rutas requieren token válido
router.use(authMiddleware);

// ── Lectura ────────────────────────────────────────────────────────────────────

// Administrador y Supervisor → ven todos los contratos
router.get('/',    autorizar('contratos:ver_todos'), getAllContratos);
router.get('/:id', autorizar('contratos:ver_todos'), getContratoById);

// Trabajador → solo sus propios contratos
router.get(
  '/mis-contratos/:id_trabajador',
  autorizar('contratos:ver_propios'),
  getContratosByTrabajador
);

// ── Escritura (solo Administrador) ─────────────────────────────────────────────

router.post(
  '/',
  autorizar('contratos:crear'),
  validarCrearContrato,
  createContrato
);

router.put(
  '/:id',
  autorizar('contratos:editar'),
  validarActualizarContrato,
  updateContrato
);

// cargarContrato adjunta req.contrato → validarEliminarContrato revisa el estado
router.delete(
  '/:id',
  autorizar('contratos:eliminar'),
  cargarContrato,
  validarEliminarContrato,
  deleteContrato
);

export default router;