import { Router } from "express";
import { authMiddleware, tenantMiddleware } from "./shared/middlewares/authMiddleware.js";
import productRoutes from './modules/product/productRoutes.js';
import userRoutes from './modules/user/userRoutes.js';
import authRoutes from './modules/auth/authRoutes.js';
import healthRoutes from './modules/health/healthRoutes.js';
import dashboardRoutes from './modules/dashboard/dashboardRoutes.js';
import tenantsRoutes from './modules/tenant/tenantRoutes.js';
import auditRoutes from './modules/audit/auditRoutes.js';
import permissionPresetRoutes from './modules/permissionPreset/permissionPresetRoutes.js';
import categoryRoutes from './modules/category/categoryRoutes.js';
import stockRoutes from './modules/stock/stockRoutes.js';
import customerRoutes from './modules/customer/customerRoutes.js';
import supplierRoutes from './modules/supplier/supplierRoutes.js';
import billRoutes from './modules/bill/billRoutes.js';
import cashierRoutes from './modules/cashier/cashierRoutes.js';
import orderRoutes from './modules/order/orderRoutes.js';
import paymentRoutes from './modules/payment/paymentRoutes.js';
import reportRoutes from './modules/report/reportRoutes.js';
import exportRoutes from './modules/export/exportRoutes.js';

// Roteador principal que agrupa todas as rotas da API.
const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/products', authMiddleware, productRoutes);
router.use('/users', authMiddleware, userRoutes);
router.use('/dashboard', authMiddleware, tenantMiddleware, dashboardRoutes);
router.use('/tenants', tenantsRoutes);
router.use('/audit', authMiddleware, auditRoutes);
router.use('/permission-presets', authMiddleware, permissionPresetRoutes);
router.use('/categories', authMiddleware, categoryRoutes);
router.use('/stock', authMiddleware, stockRoutes);
router.use('/customers', authMiddleware, customerRoutes);
router.use('/suppliers', authMiddleware, supplierRoutes);
router.use('/bills', authMiddleware, billRoutes);
router.use('/cashiers', authMiddleware, cashierRoutes);
router.use('/orders', authMiddleware, orderRoutes);
router.use('/payments', authMiddleware, paymentRoutes);
router.use('/reports', authMiddleware, tenantMiddleware, reportRoutes);
router.use('/export', authMiddleware, tenantMiddleware, exportRoutes);

export default router;
