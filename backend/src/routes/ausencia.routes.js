// routes/ausencia.routes.js

import { Router } from 'express';

import {
  crearAusencia,
  eliminarAusencia,
  obtenerAusencias,
  obtenerAusenciasPendientes,
  obtenerAusenciasPorTrabajador,
  revisarAusencia,
} from '../controllers/ausencia.controller.js';

import {
  validarCrearAusencia,
  validarRevisionAusencia,
} from '../validations/ausencia.validation.js';

import { authMiddleware } from '../middlewares/auth.middleware.js';
import { autorizar }      from '../middlewares/autorizar.middleware.js';

const router = Router();

// Todas las rutas requieren token válido
router.use(authMiddleware);

router.post('/',
  autorizar('ausencias:crear'),
  validarCrearAusencia,
  crearAusencia
);

router.get('/',
  autorizar('ausencias:ver_todas'),
  obtenerAusencias
);

router.get('/trabajador/:id',
  autorizar('ausencias:ver_propias'),
  obtenerAusenciasPorTrabajador
);

router.get('/pendientes',
  autorizar('ausencias:ver_todas'),
  obtenerAusenciasPendientes
);

router.put('/:id/revisar',
  autorizar('ausencias:revisar'),
  validarRevisionAusencia,
  revisarAusencia
);

router.delete('/:id',
  autorizar('ausencias:eliminar'),
  eliminarAusencia
);

export default router;