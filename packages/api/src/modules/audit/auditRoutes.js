// Rotas de auditoria. Acesso restrito conforme permissão audit:read.
import { Router } from 'express';
import { getAuditLogs } from './auditController.js';
import { authMiddleware, tenantMiddleware } from '../../shared/middlewares/authMiddleware.js';
import { authorize } from '../../shared/middlewares/authorizeMiddleware.js';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.js';

const router = Router();

router.get('/', authMiddleware, tenantMiddleware, authorize('audit', 'read'), asyncHandler(getAuditLogs));

export default router;
