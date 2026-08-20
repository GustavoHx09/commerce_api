// Rota de dashboard com dados resumidos do tenant. Exige autenticação.
import { Router } from 'express';
import { getDashboard } from '../controllers/dashboardController.js';
import { authMiddleware, tenantMiddleware } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Dados resumidos do tenant
 */

/**
 * @swagger
 * /dashboard:
 *   get:
 *     summary: Retorna dados resumidos do tenant
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dados do dashboard
 */
router.get('/', authMiddleware, tenantMiddleware, asyncHandler(getDashboard));

export default router;
