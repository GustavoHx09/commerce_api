import { Router } from 'express';
import { getDashboard } from '../controllers/dashboardController.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(getDashboard));

export default router;
