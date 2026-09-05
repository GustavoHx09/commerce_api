import { isEmpty } from "./fieldsValidations.js";

// Permissões padrão para cada role quando o usuário não tem permissões customizadas.
const defaultRolePermissions = {
    master: ["*"], // master pode tudo
    admin: [
        "dashboard:read",
        "tenant:read", "tenant:write",
        "users:read", "users:write", "users:delete",
        "products:read", "products:write", "products:delete",
        "categories:read", "categories:write", "categories:delete",
        "customers:read", "customers:write", "customers:delete",
        "suppliers:read", "suppliers:write", "suppliers:delete",
        "orders:read", "orders:write", "orders:delete",
        "cashier:read", "cashier:write",
        "reports:read",
        "audit:read",
    ],
    user: [
        "dashboard:read",
        "tenant:read",
        "products:read", "products:write",
        "customers:read", "customers:write",
        "orders:read", "orders:write",
        "cashier:read", "cashier:write",
    ],
};

// Retorna a lista efetiva de permissões do usuário.
export const getPermissions = (user) => {
    if (!isEmpty(user?.permissions) && Array.isArray(user.permissions) && user.permissions.length > 0) {
        return user.permissions;
    }

    return defaultRolePermissions[user?.role] || [];
};

// Verifica se o usuário possui uma permissão específica.
export const hasPermission = (user, resource, action) => {
    const permissions = getPermissions(user);

    if (permissions.includes("*")) return true;
    if (permissions.includes(`${resource}:*`)) return true;

    return permissions.includes(`${resource}:${action}`);
};

// Verifica se o usuário pode agir dentro do tenant da requisição.
// Master pode acessar qualquer tenant; admin/user apenas o próprio.
export const canAccessTenant = (user, tenantId) => {
    if (user?.role === "master") return true;
    if (!tenantId) return true;

    return user?.tenantId?.toString?.() === tenantId?.toString?.();
};
