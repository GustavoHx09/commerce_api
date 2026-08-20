import helmet from "helmet";
import rateLimit from "express-rate-limit";

export const securityHeaders = helmet();

export const rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // 100 requisições por IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: "AVISO: Muitas requisições, tente novamente mais tarde",
    },
});

export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: "AVISO: Muitas tentativas de login, tente novamente mais tarde",
    },
});
