import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import routes from "./routes/index.js";
import { connectDB } from "./config/connectDB.js";
import { appConfig } from "./config/appConfig.js";
import swaggerUi from 'swagger-ui-express';
import { requestLogger, requestLoggerConsole } from "./config/logger.js";
import { swaggerSpec } from "./config/swagger.js";
import {
    securityHeaders,
    rateLimiter,
} from "./middlewares/securityMiddleware.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorMiddleware.js";
import { sanitizeMiddleware } from "./middlewares/sanitizeMiddleware.js";

dotenv.config();

const app = express();
const allowedOrigins = appConfig.corsUrl.split(",").map((url) => url.trim()).filter(Boolean) || [
    "http://localhost:3000",
];

app.use(securityHeaders);
app.use(rateLimiter);
app.use(cors({ origin: allowedOrigins }));
app.use(requestLogger);
app.use(requestLoggerConsole);
app.use(express.json());
app.use(sanitizeMiddleware);

app.use("/api/v1", routes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(notFoundHandler);
app.use(errorHandler);

connectDB();

app.listen(appConfig.port, () => {
    console.log(`API rodando na porta http://localhost:${appConfig.port}`);
});

export default app;
