// Rotas de gerenciamento de usuários com autenticação e controle de acesso por role.
import { Router } from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  softDeleteUser,
  hardDeleteUser,
} from '../controllers/userController.js';
import { authMiddleware, isAdmin, isMaster, tenantMiddleware } from '../middlewares/authMiddleware.js';
import { validateObjectId } from '../middlewares/validateObjectId.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Gerenciamento de usuários
 */

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Lista usuários do tenant
 *     tags: [Users]
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
 *         name: role
 *         schema: { type: string, enum: [master, admin, user] }
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *       - in: query
 *         name: includeDeleted
 *         schema: { type: boolean }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [asc, desc] }
 *     responses:
 *       200:
 *         description: Usuários listados
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
 *                         $ref: '#/components/schemas/User'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *   post:
 *     summary: Cria um usuário
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, cpf, phone, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               cpf: { type: string }
 *               phone: { type: string }
 *               password: { type: string, minLength: 6 }
 *               role: { type: string, enum: [master, admin, user] }
 *               tenantId: { type: string }
 *               isActive: { type: boolean }
 *               address:
 *                 type: object
 *                 properties:
 *                   street: { type: string }
 *                   number: { type: string }
 *                   complement: { type: string }
 *                   neighborhood: { type: string }
 *                   city: { type: string }
 *                   state: { type: string }
 *                   zipCode: { type: string }
 *     responses:
 *       201:
 *         description: Usuário criado
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
 *                     user:
 *                       $ref: '#/components/schemas/User'
 */
router.get('/', authMiddleware, tenantMiddleware, asyncHandler(getUsers));
router.post('/', authMiddleware, tenantMiddleware, isAdmin, asyncHandler(createUser));

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Busca usuário por ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Usuário encontrado
 *   put:
 *     summary: Atualiza usuário
 *     tags: [Users]
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
 *             $ref: '#/components/schemas/UpdateUserInput'
 *     responses:
 *       200:
 *         description: Usuário atualizado
 *   delete:
 *     summary: Soft delete de usuário
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Usuário removido
 */
router.get('/:id', authMiddleware, tenantMiddleware, validateObjectId(), asyncHandler(getUserById));
router.put('/:id', authMiddleware, tenantMiddleware, isAdmin, validateObjectId(), asyncHandler(updateUser));
router.delete('/:id', authMiddleware, tenantMiddleware, isAdmin, validateObjectId(), asyncHandler(softDeleteUser));

/**
 * @swagger
 * /users/{id}/hard:
 *   delete:
 *     summary: Hard delete de usuário (apenas master)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Usuário deletado permanentemente
 */
router.delete('/:id/hard', authMiddleware, isMaster, validateObjectId(), asyncHandler(hardDeleteUser));

export default router;
