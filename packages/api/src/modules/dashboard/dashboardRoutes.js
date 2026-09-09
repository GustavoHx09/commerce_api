// Rota de dashboard com dados resumidos do tenant. Exige autenticação e permissão.
import { Router } from 'express';
import { getDashboard } from './dashboardController.js';
import { authMiddleware, tenantMiddleware } from '../../shared/middlewares/authMiddleware.js';
import { authorize } from '../../shared/middlewares/authorizeMiddleware.js';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.js';

const router = Router();

router.get('/', authMiddleware, tenantMiddleware, authorize('dashboard', 'read'), asyncHandler(getDashboard));

export default router;
