// Rotas de gerenciamento de produtos com autenticação e controle de acesso por role.
import { Router } from 'express';
import {
  createProduct,
  updateProduct,
  softDeleteProduct,
  hardDeleteProduct,
  getProduct,
  getProductById,
} from './productController.js';
import { authMiddleware, isAdmin, isMaster, tenantMiddleware } from '../../shared/middlewares/authMiddleware.js';
import { validateObjectId } from '../../shared/middlewares/validateObjectId.js';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.js';

const router = Router();

router.get('/', authMiddleware, tenantMiddleware, asyncHandler(getProduct));
router.post('/', authMiddleware, tenantMiddleware, isAdmin, asyncHandler(createProduct));
router.get('/:id', authMiddleware, tenantMiddleware, validateObjectId(), asyncHandler(getProductById));
router.put('/:id', authMiddleware, tenantMiddleware, isAdmin, validateObjectId(), asyncHandler(updateProduct));
router.delete('/:id', authMiddleware, tenantMiddleware, isAdmin, validateObjectId(), asyncHandler(softDeleteProduct));
router.delete('/:id/hard', authMiddleware, isMaster, validateObjectId(), asyncHandler(hardDeleteProduct));

export default router;
