import { Router } from 'express';
import {
  createProduct,
  updateProduct,
  deleteProduct,
  getProduct,
  getProductById
} from '../controllers/productController.js';
import { isAdmin } from '../middlewares/authMiddleware.js';

const router = Router();

// aqui implementar as rotas baseadas no controller
router.get('/', getProduct);
router.get('/:id', getProductById);
router.post('/', isAdmin, createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', isAdmin, deleteProduct);

export default router;