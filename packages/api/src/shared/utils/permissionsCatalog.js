// Catálogo centralizado de permissões do sistema.
// Cada permissão segue o formato "recurso:acao" e pode conter curingas "*" ou "recurso:*".
export const SYSTEM_PERMISSIONS = [
    "dashboard:read",
    "tenant:read",
    "tenant:write",
    "users:read",
    "users:write",
    "users:delete",
    "permissionPresets:read",
    "permissionPresets:write",
    "permissionPresets:delete",
    "products:read",
    "products:write",
    "products:delete",
    "categories:read",
    "categories:write",
    "categories:delete",
    "customers:read",
    "customers:write",
    "customers:delete",
    "suppliers:read",
    "suppliers:write",
    "suppliers:delete",
    "stock:read",
    "stock:write",
    "orders:read",
    "orders:write",
    "orders:delete",
    "cashier:read",
    "cashier:write",
    "reports:read",
    "audit:read",
];

// Verifica se uma permissão individual existe no catálogo ou é um curinga válido.
export const isValidPermission = (permission) => {
    if (typeof permission !== "string" || !permission.trim()) return false;
    return SYSTEM_PERMISSIONS.includes(permission);
};

// Retorna a lista ordenada de permissões válidas para exibição no painel.
export const getAvailablePermissions = () => [...SYSTEM_PERMISSIONS];
