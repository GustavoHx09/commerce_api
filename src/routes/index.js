import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import productRoutes from "../routes/productsRoutes.js";
import userRoutes from '../routes/usersRoutes.js';
import authRoutes from '../routes/authRoutes.js';
import dashboardRoutes from '../routes/dashboardRoutes.js';
import companyRoutes from '../routes/companyRoutes.js';


const router = Router();

router.use('/products', authMiddleware, productRoutes);
router.use('/users', authMiddleware, userRoutes);
router.use('/auth', authRoutes);
router.use('/dashboard', authMiddleware, dashboardRoutes);
router.use('/company', authMiddleware, companyRoutes);

export default router;