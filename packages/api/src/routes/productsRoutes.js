import { Router } from 'express';
import {
  createProduct,
  updateProduct,
  softDeleteProduct,
  hardDeleteProduct,
  getProduct,
  getProductById,
} from '../controllers/productController.js';
import { authMiddleware, isAdmin, isMaster, tenantMiddleware } from '../middlewares/authMiddleware.js';
import { validateObjectId } from '../middlewares/validateObjectId.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Gerenciamento de produtos
 */

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Lista produtos do tenant
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Produtos listados
 *   post:
 *     summary: Cria um produto
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               price: { type: number }
 *               costPrice: { type: number }
 *               quantityInStock: { type: number }
 *               category: { type: string }
 *     responses:
 *       201:
 *         description: Produto criado
 */
router.get('/', authMiddleware, tenantMiddleware, asyncHandler(getProduct));
router.post('/', authMiddleware, tenantMiddleware, isAdmin, asyncHandler(createProduct));

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Busca produto por ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Produto encontrado
 *   put:
 *     summary: Atualiza produto
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Produto atualizado
 *   delete:
 *     summary: Soft delete de produto
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Produto removido
 */
router.get('/:id', authMiddleware, tenantMiddleware, validateObjectId(), asyncHandler(getProductById));
router.put('/:id', authMiddleware, tenantMiddleware, isAdmin, validateObjectId(), asyncHandler(updateProduct));
router.delete('/:id', authMiddleware, tenantMiddleware, isAdmin, validateObjectId(), asyncHandler(softDeleteProduct));

/**
 * @swagger
 * /products/{id}/hard:
 *   delete:
 *     summary: Hard delete de produto (apenas master)
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Produto deletado permanentemente
 */
router.delete('/:id/hard', authMiddleware, isMaster, validateObjectId(), asyncHandler(hardDeleteProduct));

export default router;
