import { hasPermission } from "../utils/permissionHelpers.js";

// Middleware factory que verifica permissão granular antes de executar a rota.
export const authorize = (resource, action) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "Usuário não autenticado" });
        }

        if (!hasPermission(req.user, resource, action)) {
            return res.status(403).json({ message: "Permissão negada" });
        }

        next();
    };
};
