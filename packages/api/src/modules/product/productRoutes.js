// Rotas de gerenciamento de produtos com autenticação e controle de acesso granular.
import { Router } from 'express';
import {
  createProduct,
  updateProduct,
  softDeleteProduct,
  hardDeleteProduct,
  getProduct,
  getProductById,
} from './productController.js';
import { authMiddleware, isMaster, tenantMiddleware } from '../../shared/middlewares/authMiddleware.js';
import { authorize } from '../../shared/middlewares/authorizeMiddleware.js';
import { validateObjectId } from '../../shared/middlewares/validateObjectId.js';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.js';

const router = Router();

router.get('/', authMiddleware, tenantMiddleware, authorize('products', 'read'), asyncHandler(getProduct));
router.post('/', authMiddleware, tenantMiddleware, authorize('products', 'write'), asyncHandler(createProduct));
router.get('/:id', authMiddleware, tenantMiddleware, validateObjectId(), authorize('products', 'read'), asyncHandler(getProductById));
router.put('/:id', authMiddleware, tenantMiddleware, validateObjectId(), authorize('products', 'write'), asyncHandler(updateProduct));
router.delete('/:id', authMiddleware, tenantMiddleware, validateObjectId(), authorize('products', 'delete'), asyncHandler(softDeleteProduct));
router.delete('/:id/hard', authMiddleware, isMaster, validateObjectId(), asyncHandler(hardDeleteProduct));

export default router;
