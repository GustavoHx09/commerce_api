import fs from "fs";
import path from "path";
import morgan from "morgan";
import { fileURLToPath } from "url";
import { appConfig } from "./appConfig.js";

// Resolve o diretório do arquivo atual para criar a pasta de logs relativa à API.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Caminho absoluto para a pasta e arquivo de logs.
const logsDir = path.join(__dirname, "..", "..", "logs");
const logFilePath = path.join(logsDir, "app.log");

// Cria a pasta de logs caso ela não exista.
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Stream de escrita em modo append para registrar as requisições.
const accessLogStream = fs.createWriteStream(logFilePath, { flags: "a" });

// Token customizado do Morgan para exibir o timestamp ISO da requisição.
morgan.token("timestamp", () => {
    return new Date().toISOString();
});

// Token customizado que recupera o ID do usuário autenticado, se houver.
morgan.token("userId", (req) => {
    return req.user?.id || "anonymous";
});

// Token customizado que recupera a role do usuário autenticado, se houver.
morgan.token("role", (req) => {
    return req.user?.role || "-";
});

// Token customizado que recupera o tenantId do usuário autenticado, se houver.
morgan.token("tenantId", (req) => {
    return req.user?.tenantId || "-";
});

// Formato do log de requisição, com informações de auditoria.
const logFormat =
    "[:timestamp] :method :url :status - userId=:userId role=:role tenantId=:tenantId :response-time ms";

// Logger que salva as requisições no arquivo app.log.
export const requestLogger = morgan(logFormat, {
    stream: accessLogStream,
});

// Logger que exibe as requisições no console apenas em ambiente de desenvolvimento.
export const requestLoggerConsole = appConfig.nodeEnv === "development"
    ? morgan(logFormat)
    : (req, res, next) => next();
