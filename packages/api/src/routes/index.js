import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import productRoutes from "../routes/productsRoutes.js";
import userRoutes from '../routes/usersRoutes.js';
import authRoutes from '../routes/authRoutes.js';
import dashboardRoutes from '../routes/dashboardRoute.js';


const router = Router();

router.use('/products', authMiddleware, productRoutes);
router.use('/users', authMiddleware, userRoutes);
router.use('/auth', authRoutes);
router.use('/dashboard', authMiddleware, dashboardRoutes);

export default router;