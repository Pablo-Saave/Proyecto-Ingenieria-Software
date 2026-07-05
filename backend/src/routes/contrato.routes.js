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

import {
  getAnexosByContrato,
  crearAnexo,
  eliminarAnexo,
} from '../controllers/anexo_contrato.controller.js';

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

router.get('/',    autorizar('contratos:ver_todos'), getAllContratos);
router.get('/:id', autorizar('contratos:ver_todos'), getContratoById);

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

// cargarContratoActual adjunta req.contratoActual (el contrato tal como está
// en BD) para que validarActualizarContrato pueda comparar contra los
// valores nuevos y detectar si intentan cambiar tipo/fechas/monto.
router.put(
  '/:id',
  autorizar('contratos:editar'),
  cargarContrato,               // reutilizamos el mismo loader, adjunta req.contrato
  (req, _res, next) => {        // pequeño adapter: lo dejamos también como req.contratoActual
    req.contratoActual = req.contrato;
    next();
  },
  validarActualizarContrato,
  updateContrato
);

router.delete(
  '/:id',
  autorizar('contratos:eliminar'),
  cargarContrato,
  validarEliminarContrato,
  deleteContrato
);

// ── Anexos (modifican tipo_contrato / fechas / monto) ──────────────────────────
// Reutiliza el permiso de edición: solo quien puede editar el contrato puede
// crear/ver/eliminar sus anexos.
router.get('/:id_contrato/anexos', autorizar('contratos:editar'), getAnexosByContrato);
router.post('/:id_contrato/anexos', autorizar('contratos:editar'), crearAnexo);
router.delete('/anexos/:id_anexo', autorizar('contratos:editar'), eliminarAnexo);

export default router;