import { Router } from "express";
import { authMiddleware, tenantMiddleware } from "./shared/middlewares/authMiddleware.js";
import productRoutes from './modules/product/productRoutes.js';
import userRoutes from './modules/user/userRoutes.js';
import authRoutes from './modules/auth/authRoutes.js';
import dashboardRoutes from './modules/dashboard/dashboardRoutes.js';
import tenantsRoutes from './modules/tenant/tenantRoutes.js';
import auditRoutes from './modules/audit/auditRoutes.js';

// Roteador principal que agrupa todas as rotas da API.
const router = Router();

router.use('/auth', authRoutes);
router.use('/products', authMiddleware, productRoutes);
router.use('/users', authMiddleware, userRoutes);
router.use('/dashboard', authMiddleware, tenantMiddleware, dashboardRoutes);
router.use('/tenants', tenantsRoutes);
router.use('/audit', authMiddleware, auditRoutes);

export default router;
