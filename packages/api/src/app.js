// Ponto de entrada centralizado da API Express.
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import routes from "./routes.js";
import { appConfig } from "./shared/config/appConfig.js";
import { requestLogger, requestLoggerConsole } from "./shared/config/logger.js";
import {
    securityHeaders,
    createOriginMiddleware,
    rateLimiter,
} from "./shared/middlewares/securityMiddleware.js";
import { errorHandler, notFoundHandler } from "./shared/middlewares/errorMiddleware.js";
import { sanitizeMiddleware } from "./shared/middlewares/sanitizeMiddleware.js";

// Carrega variáveis de ambiente do arquivo .env antes de qualquer configuração.
dotenv.config();

const app = express();

// Converte a string de origens permitidas em um array para o CORS.
const allowedOrigins = appConfig.corsUrl.split(",").map((url) => url.trim()).filter(Boolean);

// Aplica middlewares de segurança e parsing.
app.use(securityHeaders);         // Adiciona headers de segurança (Helmet).
app.use(rateLimiter);             // Limita requisições por IP.
app.use(cors({ origin: allowedOrigins, credentials: true })); // Permite CORS com cookies.
app.use(createOriginMiddleware(allowedOrigins)); // Bloqueia escritas iniciadas por outros sites.
app.use(cookieParser());          // Habilita leitura de cookies nas requisições.
app.use(requestLogger);           // Salva logs de requisições em arquivo.
app.use(requestLoggerConsole);    // Exibe logs de requisições no console em dev.
app.use(express.json());          // Converte o body das requisições para JSON.
app.use(express.urlencoded({ extended: true })); // Habilita parsing de formulários com upload.
app.use(sanitizeMiddleware);        // Remove caracteres proibidos para evitar NoSQL injection.

// Serve arquivos estáticos de upload (logos). Em produção deve virar object storage.
app.use("/uploads", express.static("uploads"));

// Registra as rotas da API.
app.use("/api/v1", routes);

// Handlers de erro e rota não encontrada.
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
