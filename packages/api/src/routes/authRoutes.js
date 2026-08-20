// Rotas públicas e de sessão: login, renovação de token e logout.
import { Router } from 'express';
import { login, refresh, logout } from '../controllers/authController.js';
import { authRateLimiter } from '../middlewares/securityMiddleware.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Autenticação e gerenciamento de sessão
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Autenticação de usuário
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: master@admin.com
 *               password:
 *                 type: string
 *                 example: master123
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
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
 *                     accessToken: { type: string }
 *                     user:
 *                       type: object
 *                       properties:
 *                         id: { type: string }
 *                         name: { type: string }
 *                         email: { type: string }
 *                         role: { type: string }
 *                         tenantId: { type: string, nullable: true }
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *             description: refreshToken em cookie HttpOnly
 *       401:
 *         description: Credenciais inválidas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', authRateLimiter, login);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Renova o access token usando o refresh token do cookie
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Token renovado com sucesso
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
 *                     accessToken: { type: string }
 *                     user:
 *                       type: object
 *                       properties:
 *                         id: { type: string }
 *                         name: { type: string }
 *                         email: { type: string }
 *                         role: { type: string }
 *                         tenantId: { type: string, nullable: true }
 *       401:
 *         description: Refresh token inválido ou ausente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/refresh', refresh);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Realiza logout e limpa o refresh token
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logout realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data: { type: object, nullable: true }
 */
router.post('/logout', logout);

export default router;
