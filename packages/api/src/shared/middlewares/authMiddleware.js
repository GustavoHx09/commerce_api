import jwt from "jsonwebtoken";
import { appConfig } from "../config/appConfig.js";
import users from "../../modules/user/userModel.js";
import tenants from "../../modules/tenant/tenantModel.js";
import { isTokenRevoked } from "../../modules/auth/authService.js";
import { populateUserPermissionPreset } from "../utils/permissionHelpers.js";

// Verifica o JWT, valida se o usuário ainda existe/está ativo e anexa os dados atualizados.
export const authMiddleware = async (req, res, next) => {
    const token = req.cookies?.authToken;

    if (!token) {
        return res.status(401).json({ message: "Token não fornecido" });
    }

    try {
        const decoded = jwt.verify(token, appConfig.jwtSecret);

        const revoked = await isTokenRevoked(token);
        if (revoked) {
            return res.status(401).json({ message: "Sessão revogada" });
        }

        const user = await users
            .findOne({ _id: decoded.id, deletedAt: null })
            .select("-password");

        if (!user) {
            return res.status(401).json({ message: "Usuário não encontrado" });
        }

        if (!user.isActive) {
            return res.status(401).json({ message: "Usuário inativo" });
        }

        // Tokens emitidos antes da última troca de senha são considerados revogados.
        // O iat do JWT é em segundos; compara com o timestamp da troca em segundos.
        if (user.passwordChangedAt && decoded.iat <= Math.floor(user.passwordChangedAt.getTime() / 1000)) {
            return res.status(401).json({ message: "Sessão revogada" });
        }

        // Usuários vinculados a um tenant só acessam se o tenant estiver ativo.
        if (user.tenantId) {
            const tenant = await tenants.findOne({
                _id: user.tenantId,
                isActive: true,
                deletedAt: null,
            });

            if (!tenant) {
                return res.status(403).json({ message: "Empresa inativa ou removida" });
            }
        }

        req.user = {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId?.toString?.() || null,
            permissionPresetId: user.permissionPresetId?.toString?.() || null,
            permissions: user.permissions || [],
            revokedPermissions: user.revokedPermissions || [],
            passwordChangedAt: user.passwordChangedAt || null,
        };

        await populateUserPermissionPreset(req.user);

        next();
    } catch (error) {
        if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Token inválido ou expirado" });
        }

        return res.status(500).json({ message: "Erro ao validar sessão" });
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
