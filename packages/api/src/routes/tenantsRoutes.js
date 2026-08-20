// Rotas de gerenciamento de tenants. Acesso restrito ao usuário master.
import { Router } from 'express';
import {
  createTenant,
  getTenants,
  getTenantById,
  updateTenant,
  deleteTenant,
} from '../controllers/tenantsController.js';
import { authMiddleware, isMaster } from '../middlewares/authMiddleware.js';
import { validateObjectId } from '../middlewares/validateObjectId.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Tenants
 *   description: Gerenciamento de tenants (apenas master)
 */

/**
 * @swagger
 * /tenants:
 *   get:
 *     summary: Lista tenants
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, example: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, example: 10 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [asc, desc] }
 *     responses:
 *       200:
 *         description: Tenants listados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Tenant'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *   post:
 *     summary: Cria um tenant
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               isActive: { type: boolean }
 *     responses:
 *       201:
 *         description: Tenant criado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     tenant:
 *                       $ref: '#/components/schemas/Tenant'
 */
router.get('/', authMiddleware, isMaster, asyncHandler(getTenants));
router.post('/', authMiddleware, isMaster, asyncHandler(createTenant));

/**
 * @swagger
 * /tenants/{id}:
 *   get:
 *     summary: Busca tenant por ID
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Tenant encontrado
 *   put:
 *     summary: Atualiza tenant
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               slug: { type: string }
 *               isActive: { type: boolean }
 *     responses:
 *       200:
 *         description: Tenant atualizado
 *   delete:
 *     summary: Deleta tenant
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Tenant deletado
 */
router.get('/:id', authMiddleware, isMaster, validateObjectId(), asyncHandler(getTenantById));
router.put('/:id', authMiddleware, isMaster, validateObjectId(), asyncHandler(updateTenant));
router.delete('/:id', authMiddleware, isMaster, validateObjectId(), asyncHandler(deleteTenant));

export default router;
