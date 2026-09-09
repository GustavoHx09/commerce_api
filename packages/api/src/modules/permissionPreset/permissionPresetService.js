import {
    createPermissionPresetRepo,
    countPermissionPresetsRepo,
    getPermissionPresetsRepo,
    getPermissionPresetByIdRepo,
    updatePermissionPresetRepo,
    softDeletePermissionPresetRepo,
    restorePermissionPresetRepo,
} from "./permissionPresetRepo.js";
import { SYSTEM_PERMISSIONS } from "../../shared/utils/permissionsCatalog.js";
import { validateRequired, throwValidationError } from "../../shared/utils/serviceHelpers.js";
import { getPagination, getSort, paginatedResponse } from "../../shared/utils/paginationHelpers.js";
import { auditAction } from "../audit/auditHelpers.js";

// Garante que o nome do preset não seja vazio após trim.
const validateName = (name) => {
    validateRequired(name, "nome");

    if (String(name).trim().length === 0) {
        throwValidationError("O nome do preset é obrigatório");
    }
};

// Garante que cada permissão exista no catálogo central do sistema.
const validatePermissionsList = (permissions) => {
    if (!Array.isArray(permissions)) {
        throwValidationError("permissions deve ser um array de strings");
    }

    if (permissions.length === 0) {
        throwValidationError("O preset deve conter pelo menos uma permissão");
    }

    const invalid = permissions
        .map((p) => (typeof p === "string" ? p.trim() : ""))
        .filter((p) => !p || !SYSTEM_PERMISSIONS.includes(p));

    if (invalid.length > 0) {
        throwValidationError(`Permissões inválidas: ${invalid.join(", ")}`);
    }
};

// Normaliza o tenantId: admin usa o próprio; master pode criar global (null) ou vincular a um tenant.
const resolveTenantId = (data, actor) => {
    if (actor.role !== "master") {
        return actor.tenantId;
    }

    return data.tenantId || null;
};

// Limpa e deduplica a lista de permissões.
const sanitizePermissions = (permissions) => {
    return [...new Set(permissions.map((p) => String(p).trim()).filter(Boolean))];
};

// Cria um novo preset de permissões.
export const createPermissionPresetService = async (data, actor) => {
    validateName(data.name);
    validatePermissionsList(data.permissions);

    const tenantId = resolveTenantId(data, actor);

    const preset = await createPermissionPresetRepo({
        name: String(data.name).trim(),
        description: String(data.description || "").trim(),
        permissions: sanitizePermissions(data.permissions),
        tenantId,
        isActive: data.isActive !== false,
    });

    await auditAction("permissionPreset", "create", null, preset, actor.id);

    return preset;
};

// Lista presets visíveis para o usuário: globais (tenantId null) + do próprio tenant.
export const getPermissionPresetsService = async (query, actor) => {
    const { page, limit, skip } = getPagination(query);
    const sort = getSort(query);
    const includeDeleted = actor.role === "master" && query.includeDeleted === "true";

    const filter = { ...baseQueryForActor(actor, includeDeleted) };

    if (query.isActive !== undefined) {
        filter.isActive = query.isActive === "true";
    }

    if (query.search) {
        const term = query.search.trim();
        filter.$or = [
            { name: { $regex: term, $options: "i" } },
            { description: { $regex: term, $options: "i" } },
        ];
    }

    const [presets, total] = await Promise.all([
        getPermissionPresetsRepo(filter, skip, limit, sort),
        countPermissionPresetsRepo(filter),
    ]);

    return paginatedResponse(presets, page, limit, total);
};

// Busca um preset pelo ID respeitando o escopo do usuário.
export const getPermissionPresetByIdService = async (id, actor) => {
    const preset = await getPermissionPresetByIdRepo(id, null, true);

    if (!preset) {
        throwValidationError("Preset não encontrado", 404);
    }

    ensurePresetAccess(preset, actor);

    return preset;
};

// Atualiza um preset existente.
export const updatePermissionPresetService = async (id, data, actor) => {
    const previous = await getPermissionPresetByIdRepo(id, null, true);

    if (!previous) {
        throwValidationError("Preset não encontrado", 404);
    }

    ensurePresetAccess(previous, actor);

    const update = {};

    if (data.name !== undefined) {
        validateName(data.name);
        update.name = String(data.name).trim();
    }

    if (data.description !== undefined) {
        update.description = String(data.description).trim();
    }

    if (data.permissions !== undefined) {
        validatePermissionsList(data.permissions);
        update.permissions = sanitizePermissions(data.permissions);
    }

    if (data.isActive !== undefined) {
        if (typeof data.isActive !== "boolean") {
            throwValidationError("isActive deve ser booleano");
        }
        update.isActive = data.isActive;
    }

    if (Object.keys(update).length === 0) {
        throwValidationError("Nenhum campo válido para atualização");
    }

    const preset = await updatePermissionPresetRepo(id, update, null);

    await auditAction("permissionPreset", "update", previous, preset, actor.id);

    return preset;
};

// Realiza soft delete de um preset.
export const softDeletePermissionPresetService = async (id, actor) => {
    const previous = await getPermissionPresetByIdRepo(id, null, true);

    if (!previous) {
        throwValidationError("Preset não encontrado", 404);
    }

    ensurePresetAccess(previous, actor);

    const preset = await softDeletePermissionPresetRepo(id, null);

    await auditAction("permissionPreset", "delete", previous, preset, actor.id);

    return preset;
};

// Restaura um preset excluído por soft delete.
export const restorePermissionPresetService = async (id, actor) => {
    const previous = await getPermissionPresetByIdRepo(id, null, true);

    if (!previous) {
        throwValidationError("Preset não encontrado", 404);
    }

    ensurePresetAccess(previous, actor);

    const preset = await restorePermissionPresetRepo(id, null);

    await auditAction("permissionPreset", "restore", previous, preset, actor.id);

    return preset;
};

// Monta o filtro base considerando os presets globais e os do tenant do usuário.
const baseQueryForActor = (actor, includeDeleted = false) => {
    const query = {};

    if (actor.role !== "master") {
        query.$or = [{ tenantId: actor.tenantId }, { tenantId: null }];
    }

    if (!includeDeleted) {
        query.deletedAt = null;
    }

    return query;
};

// Garante que o usuário pode acessar/editar o preset (próprio tenant ou global).
const ensurePresetAccess = (preset, actor) => {
    if (actor.role === "master") return;

    const presetTenantId = preset.tenantId?.toString?.() || null;
    const actorTenantId = actor.tenantId?.toString?.() || null;

    // Admin/user acessa presets globais (tenantId nulo) ou do próprio tenant.
    if (presetTenantId && presetTenantId !== actorTenantId) {
        throwValidationError("Acesso negado a este preset", 403);
    }
};
