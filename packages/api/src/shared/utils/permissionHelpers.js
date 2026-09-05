import permissionPresets from "../../modules/permissionPreset/permissionPresetModel.js";

// Permissões padrão para cada role quando o usuário não tem preset nem permissões customizadas.
const defaultRolePermissions = {
    master: ["*"], // master pode tudo
    admin: [
        "dashboard:read",
        "tenant:read", "tenant:write",
        "users:read", "users:write", "users:delete",
        "permissionPresets:read", "permissionPresets:write", "permissionPresets:delete",
        "products:read", "products:write", "products:delete",
        "categories:read", "categories:write", "categories:delete",
        "customers:read", "customers:write", "customers:delete",
        "suppliers:read", "suppliers:write", "suppliers:delete",
        "stock:read", "stock:write",
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

// Popula o preset de permissões do usuário para uso no helper síncrono.
// Deve ser chamada uma vez por request autenticada, idealmente no authMiddleware.
export const populateUserPermissionPreset = async (user) => {
    if (!user?.permissionPresetId) {
        user.preset = null;
        return user;
    }

    const preset = await permissionPresets
        .findOne({ _id: user.permissionPresetId, deletedAt: null })
        .select("permissions")
        .lean();

    user.preset = preset;
    return user;
};

// Retorna a lista efetiva de permissões do usuário.
// Regras:
// 1. Se houver preset ativo, ele vira a base.
// 2. Se não houver preset e o usuário tiver permissões, essas permissoões valem como base (legado).
// 3. Caso contrário, usa as permissões padrão da role.
// 4. Adiciona as permissões extras manuais (aplicadas quando há preset).
// 5. Remove as permissões revogadas individualmente.
export const getPermissions = (user) => {
    if (!user) return [];

    let base;
    const extras = user.permissionPresetId && user.permissions?.length ? user.permissions : [];
    const revoked = user.revokedPermissions || [];

    if (user.preset?.permissions?.length) {
        base = [...user.preset.permissions];
    } else if (user.permissions?.length) {
        // Sem preset: o campo permissions representa a lista completa (comportamento anterior).
        base = [...user.permissions];
    } else {
        base = defaultRolePermissions[user.role] || [];
    }

    const effective = new Set(base);
    extras.forEach((p) => effective.add(p));
    revoked.forEach((p) => effective.delete(p));

    return Array.from(effective);
};

// Verifica se o usuário possui uma permissão específica, considerando também revogações.
export const hasPermission = (user, resource, action) => {
    const permissions = getPermissions(user);
    const revoked = user?.revokedPermissions || [];
    const target = `${resource}:${action}`;

    // Revogações exatas ou curingas bloqueiam antes de qualquer outra regra.
    if (revoked.includes(target) || revoked.includes(`${resource}:*`) || revoked.includes("*")) {
        return false;
    }

    if (permissions.includes("*")) return true;
    if (permissions.includes(`${resource}:*`)) return true;

    return permissions.includes(target);
};

// Verifica se o usuário pode agir dentro do tenant da requisição.
// Master pode acessar qualquer tenant; admin/user apenas o próprio.
export const canAccessTenant = (user, tenantId) => {
    if (user?.role === "master") return true;
    if (!tenantId) return true;

    return user?.tenantId?.toString?.() === tenantId?.toString?.();
};
