// Rotas de exportação de dados do tenant. Exigem autenticação e permissão de leitura de relatórios.
import { Router } from 'express';
import { exportResource } from './exportController.js';
import { authMiddleware, tenantMiddleware } from '../../shared/middlewares/authMiddleware.js';
import { authorize } from '../../shared/middlewares/authorizeMiddleware.js';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.js';

const router = Router();

router.get('/:resource', authMiddleware, tenantMiddleware, authorize('reports', 'read'), asyncHandler(exportResource));

export default router;
