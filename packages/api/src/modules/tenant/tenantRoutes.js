// Rotas de gerenciamento de tenants. Acesso restrito ao usuário master.
import { Router } from 'express';
import {
  createTenant,
  getTenants,
  getTenantById,
  updateTenant,
  deleteTenant,
  getOwnTenant,
  updateOwnTenant,
  restoreTenant,
  uploadTenantLogo,
} from './tenantController.js';
import { authMiddleware, isMaster, tenantMiddleware } from '../../shared/middlewares/authMiddleware.js';
import { authorize } from '../../shared/middlewares/authorizeMiddleware.js';
import { validateObjectId } from '../../shared/middlewares/validateObjectId.js';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.js';
import { uploadLogo } from '../../shared/utils/upload/multerConfig.js';

const router = Router();

// Gerenciamento global de tenants: apenas master.
router.get('/', authMiddleware, isMaster, asyncHandler(getTenants));
router.post('/', authMiddleware, isMaster, asyncHandler(createTenant));
router.get('/:id', authMiddleware, isMaster, validateObjectId(), asyncHandler(getTenantById));
router.put('/:id', authMiddleware, isMaster, validateObjectId(), asyncHandler(updateTenant));
router.put('/:id/restore', authMiddleware, isMaster, validateObjectId(), asyncHandler(restoreTenant));
router.delete('/:id', authMiddleware, isMaster, validateObjectId(), asyncHandler(deleteTenant));

// Acesso/edição dos próprios dados da empresa vinculada ao usuário.
// Um admin só pode alterar a própria empresa porque tenantMiddleware fixa req.tenantId.
router.get('/me', authMiddleware, tenantMiddleware, authorize('tenant', 'read'), asyncHandler(getOwnTenant));
router.put('/me', authMiddleware, tenantMiddleware, authorize('tenant', 'write'), asyncHandler(updateOwnTenant));
router.post('/me/logo', authMiddleware, tenantMiddleware, authorize('tenant', 'write'), uploadLogo, asyncHandler(uploadTenantLogo));

export default router;
