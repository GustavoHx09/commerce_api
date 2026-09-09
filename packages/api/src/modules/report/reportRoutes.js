// Rotas de relatórios de vendas e estoque. Exigem autenticação e permissão de leitura.
import { Router } from 'express';
import {
    getSalesReport,
    getTopProductsReport,
    getInventoryReport,
    getStockMovementsReport,
    getCashFlowReport,
} from './reportController.js';
import { authMiddleware, tenantMiddleware } from '../../shared/middlewares/authMiddleware.js';
import { authorize } from '../../shared/middlewares/authorizeMiddleware.js';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.js';

const router = Router();

router.get('/sales', authMiddleware, tenantMiddleware, authorize('reports', 'read'), asyncHandler(getSalesReport));
router.get('/products', authMiddleware, tenantMiddleware, authorize('reports', 'read'), asyncHandler(getTopProductsReport));
router.get('/inventory', authMiddleware, tenantMiddleware, authorize('reports', 'read'), asyncHandler(getInventoryReport));
router.get('/stock-movements', authMiddleware, tenantMiddleware, authorize('reports', 'read'), asyncHandler(getStockMovementsReport));
router.get('/cash-flow', authMiddleware, tenantMiddleware, authorize('reports', 'read'), asyncHandler(getCashFlowReport));

export default router;
