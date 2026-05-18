import { Router } from 'express';
import {
  createProduct,
  updateProduct,
  deleteProduct,
  getProduct,
  getProductById
} from '../controllers/productController.js';
import { permissions } from '../middlewares/authMiddleware.js';

const router = Router();

// aqui implementar as rotas baseadas no controller
router.get('/', getProduct);
router.get('/:id', getProductById);
router.post('/', permissions, createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', permissions, deleteProduct);

export default router;