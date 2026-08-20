import fs from "fs";
import path from "path";
import morgan from "morgan";
import { fileURLToPath } from "url";
import { appConfig } from "./appConfig.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logsDir = path.join(__dirname, "..", "..", "logs");
const logFilePath = path.join(logsDir, "app.log");

if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

const accessLogStream = fs.createWriteStream(logFilePath, { flags: "a" });

morgan.token("timestamp", () => {
    return new Date().toISOString();
});

morgan.token("userId", (req) => {
    return req.user?.id || "anonymous";
});

morgan.token("role", (req) => {
    return req.user?.role || "-";
});

morgan.token("tenantId", (req) => {
    return req.user?.tenantId || "-";
});

const logFormat =
    "[:timestamp] :method :url :status - userId=:userId role=:role tenantId=:tenantId :response-time ms";

export const requestLogger = morgan(logFormat, {
    stream: accessLogStream,
});

export const requestLoggerConsole = appConfig.nodeEnv === "development"
    ? morgan(logFormat)
    : (req, res, next) => next();
