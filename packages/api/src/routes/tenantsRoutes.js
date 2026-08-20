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
 *         description: Tenants listados
 *   post:
 *     summary: Cria um tenant
 *     tags: [Tenants]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               isActive: { type: boolean }
 *     responses:
 *       201:
 *         description: Tenant criado
 */
router.get('/', authMiddleware, isMaster, asyncHandler(getTenants));
router.post('/', authMiddleware, isMaster, asyncHandler(createTenant));

/**
 * @swagger
 * /tenants/{id}:
 *   get:
 *     summary: Busca tenant por ID
 *     tags: [Tenants]
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
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Tenant atualizado
 *   delete:
 *     summary: Deleta tenant
 *     tags: [Tenants]
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
