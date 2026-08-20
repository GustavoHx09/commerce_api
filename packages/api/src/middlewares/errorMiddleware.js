import { appConfig } from "../config/appConfig.js";

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

export const notFoundHandler = (req, res) => {
    res.status(404).json({ message: "Rota não encontrada" });
};
