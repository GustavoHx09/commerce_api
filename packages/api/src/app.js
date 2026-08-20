// Ponto de entrada centralizado da API Express.
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import routes from "./routes/index.js";
import swaggerUi from 'swagger-ui-express';
import { connectDB } from "./config/connectDB.js";
import { appConfig } from "./config/appConfig.js";
import { requestLogger, requestLoggerConsole } from "./config/logger.js";
import { swaggerSpec } from "./config/swagger.js";
import {
    securityHeaders,
    rateLimiter,
} from "./middlewares/securityMiddleware.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorMiddleware.js";
import { sanitizeMiddleware } from "./middlewares/sanitizeMiddleware.js";

// Carrega variáveis de ambiente do arquivo .env antes de qualquer configuração.
dotenv.config();

const app = express();

// Converte a string de origens permitidas em um array para o CORS.
const allowedOrigins = appConfig.corsUrl.split(",").map((url) => url.trim()).filter(Boolean) || [
    "http://localhost:3000",
];

// Aplica middlewares de segurança e parsing.
app.use(securityHeaders);         // Adiciona headers de segurança (Helmet).
app.use(rateLimiter);             // Limita requisições por IP.
app.use(cors({ origin: allowedOrigins, credentials: true })); // Permite CORS com cookies.
app.use(cookieParser());          // Habilita leitura de cookies nas requisições.
app.use(requestLogger);           // Salva logs de requisições em arquivo.
app.use(requestLoggerConsole);    // Exibe logs de requisições no console em dev.
app.use(express.json());          // Converte o body das requisições para JSON.
app.use(sanitizeMiddleware);        // Remove caracteres proibidos para evitar NoSQL injection.

// Registra as rotas da API e a documentação Swagger.
app.use("/api/v1", routes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Handlers de erro e rota não encontrada.
app.use(notFoundHandler);
app.use(errorHandler);

// Inicia a conexão com o MongoDB.
connectDB();

// Inicia o servidor na porta definida em variável de ambiente.
app.listen(appConfig.port, () => {
    console.log(`API rodando na porta http://localhost:${appConfig.port}`);
});

export default app;
