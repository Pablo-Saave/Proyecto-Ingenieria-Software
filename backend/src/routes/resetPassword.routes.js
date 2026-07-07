import { Router } from 'express';
import { solicitarReset, verificarReset } from '../controllers/resetPasswordController.js';

const router = Router();

router.post('/solicitar-reset', solicitarReset);
router.post('/verificar-reset', verificarReset);

export default router;