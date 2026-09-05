// Rotas de gerenciamento de usuários com autenticação e controle de acesso granular.
import { Router } from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  softDeleteUser,
  hardDeleteUser,
} from './userController.js';
import { authMiddleware, isMaster, tenantMiddleware } from '../../shared/middlewares/authMiddleware.js';
import { authorize } from '../../shared/middlewares/authorizeMiddleware.js';
import { validateObjectId } from '../../shared/middlewares/validateObjectId.js';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.js';

const router = Router();

router.get('/', authMiddleware, tenantMiddleware, authorize('users', 'read'), asyncHandler(getUsers));
router.post('/', authMiddleware, tenantMiddleware, authorize('users', 'write'), asyncHandler(createUser));
router.get('/:id', authMiddleware, tenantMiddleware, validateObjectId(), authorize('users', 'read'), asyncHandler(getUserById));
router.put('/:id', authMiddleware, tenantMiddleware, validateObjectId(), authorize('users', 'write'), asyncHandler(updateUser));
router.delete('/:id', authMiddleware, tenantMiddleware, validateObjectId(), authorize('users', 'delete'), asyncHandler(softDeleteUser));
router.delete('/:id/hard', authMiddleware, isMaster, validateObjectId(), asyncHandler(hardDeleteUser));

export default router;
