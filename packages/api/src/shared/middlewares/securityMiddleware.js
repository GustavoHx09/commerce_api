import helmet from "helmet";
import rateLimit from "express-rate-limit";

// Adiciona headers de segurança nas respostas HTTP.
export const securityHeaders = helmet();

// Bloqueia requisições de escrita originadas por sites não autorizados.
export const createOriginMiddleware = (allowedOrigins) => {
    const allowedOriginSet = new Set(allowedOrigins);
    const protectedMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

    return (req, res, next) => {
        const origin = req.get("origin");

        if (protectedMethods.has(req.method) && origin && !allowedOriginSet.has(origin)) {
            return res.status(403).json({ message: "Origem não autorizada" });
        }

        next();
    };
};

// Limita o número total de requisições por IP em uma janela de tempo.
export const rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // 100 requisições por IP
    standardHeaders: true,
    legacyHeaders: false,
    // Desabilita a validação do proxy para ambientes como o Render, onde o trust proxy é gerenciado no app.
    validate: { xForwardedForHeader: false },
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
    validate: { xForwardedForHeader: false },
    message: {
        message: "AVISO: Muitas tentativas de login, tente novamente mais tarde",
    },
});
