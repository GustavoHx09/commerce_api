// Rotas públicas de login e logout e rota protegida de consulta da sessão.
import { Router } from 'express';
import { login, getSession, logout } from './authController.js';
import { authMiddleware } from '../../shared/middlewares/authMiddleware.js';
import { authRateLimiter } from '../../shared/middlewares/securityMiddleware.js';

const router = Router();

router.post('/login', authRateLimiter, login);
router.get('/session', authMiddleware, getSession);
router.post('/logout', logout);

export default router;
