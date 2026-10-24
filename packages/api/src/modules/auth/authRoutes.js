// Rotas públicas de login, logout e recuperação de senha, e rota protegida de consulta da sessão.
import { Router } from 'express';
import { login, getSession, logout, forgotPassword, resetPasswordController } from './authController.js';
import { authMiddleware } from '../../shared/middlewares/authMiddleware.js';
import { authRateLimiter } from '../../shared/middlewares/securityMiddleware.js';

const router = Router();

router.post('/login', authRateLimiter, login);
router.get('/session', authMiddleware, getSession);
router.post('/logout', logout);
// Recuperação de senha usa o mesmo rate limit do login para evitar abuso de envio de emails.
router.post('/forgot-password', authRateLimiter, forgotPassword);
router.post('/reset-password', authRateLimiter, resetPasswordController);

export default router;
