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
 *         description: Usuários listados
 *   post:
 *     summary: Cria um usuário
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               cpf: { type: string }
 *               phone: { type: string }
 *               password: { type: string }
 *               role: { type: string, enum: [master, admin, user] }
 *               tenantId: { type: string }
 *     responses:
 *       201:
 *         description: Usuário criado
 */
router.get('/', authMiddleware, tenantMiddleware, asyncHandler(getUsers));
router.post('/', authMiddleware, tenantMiddleware, isAdmin, asyncHandler(createUser));

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Busca usuário por ID
 *     tags: [Users]
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
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Usuário atualizado
 *   delete:
 *     summary: Soft delete de usuário
 *     tags: [Users]
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
