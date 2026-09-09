import { Router } from 'express';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.js';
import { getHealth } from './healthController.js';

const router = Router();

// Health check público para monitoramento de uptime.
router.get('/', asyncHandler(getHealth));

export default router;
