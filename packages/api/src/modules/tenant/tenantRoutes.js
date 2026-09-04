// Rotas de gerenciamento de tenants. Acesso restrito ao usuário master.
import { Router } from 'express';
import {
  createTenant,
  getTenants,
  getTenantById,
  updateTenant,
  deleteTenant,
} from './tenantController.js';
import { authMiddleware, isMaster } from '../../shared/middlewares/authMiddleware.js';
import { validateObjectId } from '../../shared/middlewares/validateObjectId.js';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.js';

const router = Router();

router.get('/', authMiddleware, isMaster, asyncHandler(getTenants));
router.post('/', authMiddleware, isMaster, asyncHandler(createTenant));
router.get('/:id', authMiddleware, isMaster, validateObjectId(), asyncHandler(getTenantById));
router.put('/:id', authMiddleware, isMaster, validateObjectId(), asyncHandler(updateTenant));
router.delete('/:id', authMiddleware, isMaster, validateObjectId(), asyncHandler(deleteTenant));

export default router;
