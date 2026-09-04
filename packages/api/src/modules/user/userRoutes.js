// Rotas de gerenciamento de usuários com autenticação e controle de acesso por role.
import { Router } from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  softDeleteUser,
  hardDeleteUser,
} from './userController.js';
import { authMiddleware, isAdmin, isMaster, tenantMiddleware } from '../../shared/middlewares/authMiddleware.js';
import { validateObjectId } from '../../shared/middlewares/validateObjectId.js';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.js';

const router = Router();

router.get('/', authMiddleware, tenantMiddleware, asyncHandler(getUsers));
router.post('/', authMiddleware, tenantMiddleware, isAdmin, asyncHandler(createUser));
router.get('/:id', authMiddleware, tenantMiddleware, validateObjectId(), asyncHandler(getUserById));
router.put('/:id', authMiddleware, tenantMiddleware, isAdmin, validateObjectId(), asyncHandler(updateUser));
router.delete('/:id', authMiddleware, tenantMiddleware, isAdmin, validateObjectId(), asyncHandler(softDeleteUser));
router.delete('/:id/hard', authMiddleware, isMaster, validateObjectId(), asyncHandler(hardDeleteUser));

export default router;
