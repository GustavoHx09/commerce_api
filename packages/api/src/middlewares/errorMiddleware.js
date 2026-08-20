import { appConfig } from "../config/appConfig.js";

// Middleware centralizado de tratamento de erros.
// Retorna a mensagem e, em desenvolvimento, o stack trace completo.
export const errorHandler = (err, req, res, _next) => {
    const statusCode = err.statusCode || err.status || 500;
    const message = err.message || "Erro interno no servidor";

    if (appConfig.nodeEnv === "development") {
        return res.status(statusCode).json({
            message,
            stack: err.stack,
        });
    }

    return res.status(statusCode).json({ message });
};

// Middleware executado quando nenhuma rota corresponde à requisição.
export const notFoundHandler = (req, res) => {
    res.status(404).json({ message: "Rota não encontrada" });
};
