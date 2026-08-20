import jwt from "jsonwebtoken";
import { appConfig } from "../config/appConfig.js";

// Verifica o access token JWT e anexa os dados do usuário na requisição.
export const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Token não fornecido" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, appConfig.jwtSecret);
        req.user = decoded;
        next();
    } catch {
        return res.status(401).json({ message: "Token inválido" });
    }
};

// Middleware de autorização: permite acesso apenas para usuários master.
export const isMaster = (req, res, next) => {
    if (req.user?.role !== "master") {
        return res.status(403).json({ message: "Acesso restrito a master" });
    }
    next();
};

// Middleware de autorização: permite acesso para master e admin.
export const isAdmin = (req, res, next) => {
    if (req.user?.role !== "master" && req.user?.role !== "admin") {
        return res.status(403).json({ message: "Acesso restrito a admin ou master" });
    }
    next();
};

// Anexa o tenantId do usuário autenticado na requisição para filtrar dados.
// Usuários master não possuem tenantId e podem acessar todos os tenants.
export const tenantMiddleware = (req, res, next) => {
    if (req.user.role === "master") {
        req.tenantId = req.query.tenantId || null;
    } else {
        req.tenantId = req.user.tenantId;
    }

    next();
};
