import helmet from "helmet";
import rateLimit from "express-rate-limit";

// Adiciona headers de segurança nas respostas HTTP.
export const securityHeaders = helmet();

// Limita o número total de requisições por IP em uma janela de tempo.
export const rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // 100 requisições por IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: "AVISO: Muitas requisições, tente novamente mais tarde",
    },
});

// Limita tentativas de login para prevenir brute force.
export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10, // 10 tentativas por IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: "AVISO: Muitas tentativas de login, tente novamente mais tarde",
    },
});
