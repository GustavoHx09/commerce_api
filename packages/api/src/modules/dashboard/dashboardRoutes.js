// Rota de dashboard com dados resumidos do tenant. Exige autenticação.
import { Router } from 'express';
import { getDashboard } from './dashboardController.js';
import { authMiddleware, tenantMiddleware } from '../../shared/middlewares/authMiddleware.js';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.js';

const router = Router();

router.get('/', authMiddleware, tenantMiddleware, asyncHandler(getDashboard));

export default router;
