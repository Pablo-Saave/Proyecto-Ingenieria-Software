// routes/ausencia.routes.js
import { Router } from 'express';

import {
  crearAusencia,
  crearAusenciaPorSupervisor,
  justificarAusencia,
  eliminarAusencia,
  obtenerAusencias,
  obtenerAusenciasPendientes,
  obtenerAusenciasPorTrabajador,
  revisarAusencia,
} from '../controllers/ausencia.controller.js';

import { subirDocumento } from '../controllers/documento.controller.js';
import { uploadPDF }      from '../middlewares/upload.middleware.js';

import {
  validarCrearAusencia,
  validarCrearAusenciaSupervisor,
  validarJustificarAusencia,
  validarRevisionAusencia,
} from '../validations/ausencia.validation.js';

import { authMiddleware } from '../middlewares/auth.middleware.js';
import { autorizar }      from '../middlewares/autorizar.middleware.js';

const router = Router();

router.use(authMiddleware);

// Flujo normal — trabajador solicita con anticipación
router.post('/',
  autorizar('ausencias:crear'),
  validarCrearAusencia,
  crearAusencia
);

// Flujo espontáneo — supervisor registra inasistencia detectada
router.post('/supervisor',
  autorizar('ausencias:revisar'), // mismo permiso que revisar (solo supervisor/admin)
  validarCrearAusenciaSupervisor,
  crearAusenciaPorSupervisor
);

// El trabajador completa su justificación
router.put('/:id/justificar',
  autorizar('ausencias:crear'), // cualquier rol que pueda tener ausencias propias
  validarJustificarAusencia,
  justificarAusencia
);

router.get('/',               autorizar('ausencias:ver_todas'),                       obtenerAusencias);
router.get('/trabajador/:id', autorizar('ausencias:ver_propias'),                     obtenerAusenciasPorTrabajador);
router.get('/pendientes',     autorizar('ausencias:ver_todas'),                       obtenerAusenciasPendientes);
router.put('/:id/revisar',    autorizar('ausencias:revisar'),                         validarRevisionAusencia, revisarAusencia);
router.delete('/:id',         autorizar('ausencias:eliminar'),                        eliminarAusencia);

router.post('/:id/documento', autorizar('ausencias:crear'), uploadPDF, subirDocumento);

export default router;