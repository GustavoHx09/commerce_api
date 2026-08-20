import { Router } from "express";
import { authMiddleware, tenantMiddleware } from "../middlewares/authMiddleware.js";
import productRoutes from "../routes/productsRoutes.js";
import userRoutes from '../routes/usersRoutes.js';
import authRoutes from '../routes/authRoutes.js';
import dashboardRoutes from '../routes/dashboardRoute.js';
import tenantsRoutes from '../routes/tenantsRoutes.js';

// Roteador principal que agrupa todas as rotas da API.
const router = Router();

router.use('/auth', authRoutes);
router.use('/products', authMiddleware, productRoutes);
router.use('/users', authMiddleware, userRoutes);
router.use('/dashboard', authMiddleware, tenantMiddleware, dashboardRoutes);
router.use('/tenants', tenantsRoutes);

export default router;
