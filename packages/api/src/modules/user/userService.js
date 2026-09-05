import bcrypt from "bcrypt";
import tenants from "../tenant/tenantModel.js";
import {
    createUserRepo,
    getUsersRepo,
    countUsersRepo,
    getUserByIdRepo,
    getUserByIdWithPasswordRepo,
    updateUserRepo,
    softDeleteUserRepo,
    restoreUserRepo,
    hardDeleteUserRepo,
} from "./userRepo.js";
import { baseQuery } from "../../shared/utils/repositoryHelpers.js";
import { isEmpty, isValid, numberFormatReplace, isValidPhone, isValidCPF, cepIsValid, emailIsValid } from "../../shared/utils/fieldsValidations.js";
import { validateRequired, validateEnum, throwValidationError } from "../../shared/utils/serviceHelpers.js";
import { getPagination, getSort, paginatedResponse } from "../../shared/utils/paginationHelpers.js";
import { emailExists, cpfExists } from "./userValidations.js";
import { auditAction } from "../audit/auditHelpers.js";
import permissionPresets from "../permissionPreset/permissionPresetModel.js";
import { SYSTEM_PERMISSIONS } from "../../shared/utils/permissionsCatalog.js";

const addressFields = [
    "number",
    "street",
    "neighborhood",
    "zipCode",
    "complement",
    "city",
    "state",
];

const allowedRoles = ["master", "admin", "user"];

// Padroniza o objeto de endereço, convertendo campos vazios em null.
const normalizeAddress = (address) => {
    if (!address) return null;

    const normalized = {};

    addressFields.forEach((field) => {
        normalized[field] = isEmpty(address[field]) ? null : address[field];
    });

    return normalized;
};

// Valida o array de permissões contra o catálogo do sistema.
const validatePermissionStringArray = (permissions, fieldName) => {
    if (permissions === undefined) return;

    if (!Array.isArray(permissions)) {
        throwValidationError(`${fieldName} deve ser um array de strings`, 422);
    }

    const invalid = permissions
        .map((p) => (typeof p === "string" ? p.trim() : ""))
        .filter((p) => !p || !SYSTEM_PERMISSIONS.includes(p));

    if (invalid.length > 0) {
        throwValidationError(`${fieldName} inválidas: ${invalid.join(", ")}`, 422);
    }
};

// Garante que um preset, se informado, exista e possa ser usado pelo actor.
const validatePermissionPreset = async (data, user, actor) => {
    if (data.permissionPresetId === undefined) return;

    const id = data.permissionPresetId;

    if (!id || id === null) {
        data.permissionPresetId = null;
        return;
    }

    const preset = await permissionPresets
        .findOne({ _id: id, deletedAt: null })
        .select("tenantId")
        .lean();

    if (!preset) {
        throwValidationError("Preset não encontrado", 404);
    }

    // Master pode vincular qualquer preset ativo.
    if (actor.role === "master") return;

    const presetTenantId = preset.tenantId?.toString?.() || null;
    const actorTenantId = actor.tenantId?.toString?.() || null;

    // Admin/user só usam presets do próprio tenant ou presets globais.
    if (presetTenantId && presetTenantId !== actorTenantId) {
        throwValidationError("Preset não pertence ao seu tenant", 403);
    }

    // Se estiver editando um usuário específico, o preset deve pertencer ao mesmo tenant do usuário.
    if (user?.tenantId && presetTenantId && presetTenantId !== user.tenantId.toString()) {
        throwValidationError("Preset não pertence ao tenant do usuário", 403);
    }
};

// Verifica se o tenant existe e se ainda há vaga para criar usuários.
const checkTenantCapacity = async (tenantId, excludeUserId = null) => {
    const tenant = await tenants.findOne({ _id: tenantId, deletedAt: null });

    if (!tenant) {
        throwValidationError("Tenant não encontrado", 404);
    }

    const filter = { tenantId, role: { $ne: "master" }, deletedAt: null };
    if (excludeUserId) filter._id = { $ne: excludeUserId };

    const count = await countUsersRepo(filter);

    if (count >= tenant.maxUsers) {
        throwValidationError("Limite de usuários do plano atingido", 403);
    }

    return tenant;
};

// Limpa e deduplica uma lista de permissões.
const sanitizePermissionArray = (permissions) => {
    if (permissions === undefined) return undefined;
    return [...new Set(permissions.map((p) => String(p).trim()).filter(Boolean))];
};

// Valida os dados obrigatórios e regras de negócio na criação de um usuário.
const validateCreate = async (data, actor) => {
    validateRequired(data.name, "nome");
    validateRequired(data.email, "email");

    if (!emailIsValid(data.email)) {
        throwValidationError("Email inválido", 422);
    }

    await emailExists(data.email);

    validateRequired(data.cpf, "CPF");

    if (!isValidCPF(data.cpf)) {
        throwValidationError("CPF inválido", 422);
    }

    data.cpf = numberFormatReplace(data.cpf);
    await cpfExists(data.cpf);

    validateRequired(data.phone, "telefone");

    if (!isValidPhone(data.phone)) {
        throwValidationError("Telefone inválido", 422);
    }

    data.phone = numberFormatReplace(data.phone);

    if (isEmpty(data.password) || data.password.length < 6) {
        throwValidationError("A senha deve ter no mínimo 6 caracteres");
    }

    data.password = await bcrypt.hash(data.password, 10);

    if (isEmpty(data.role)) {
        data.role = "user";
    }

    validateEnum(data.role, allowedRoles, "Role");

    if (data.role === "master" && actor.role !== "master") {
        throwValidationError("Apenas master pode criar outro master", 403);
    }

    if (data.role !== "master" && isEmpty(data.tenantId)) {
        throwValidationError("Usuários admin/user devem ter um tenantId");
    }

    if (data.role !== "master") {
        await checkTenantCapacity(data.tenantId);
    }

    if (data.role === "master") {
        data.tenantId = null;
    }

    validatePermissionStringArray(data.permissions, "permissions");
    validatePermissionStringArray(data.revokedPermissions, "revokedPermissions");
    await validatePermissionPreset(data, null, actor);

    data.permissions = sanitizePermissionArray(data.permissions);
    data.revokedPermissions = sanitizePermissionArray(data.revokedPermissions);

    data.address = normalizeAddress(data.address);

    if (data.address?.zipCode && !cepIsValid(data.address.zipCode)) {
        throwValidationError("CEP inválido", 422);
    }

    if (isEmpty(data.isActive)) {
        data.isActive = true;
    } else if (typeof data.isActive !== "boolean") {
        throwValidationError("isActive deve ser booleano");
    }
};

// Valida os dados enviados na atualização de um usuário.
const validateUpdate = async (data, user, actor) => {
    if (data.name !== undefined && isEmpty(data.name)) {
        throwValidationError("O nome é obrigatório");
    }

    if (data.email !== undefined) {
        validateRequired(data.email, "email");

        if (!emailIsValid(data.email)) {
            throwValidationError("Email inválido", 422);
        }

        if (data.email.toLowerCase() !== user.email.toLowerCase()) {
            await emailExists(data.email);
        }
    }

    if (data.cpf !== undefined) {
        validateRequired(data.cpf, "CPF");

        if (!isValidCPF(data.cpf)) {
            throwValidationError("CPF inválido", 422);
        }

        data.cpf = numberFormatReplace(data.cpf);

        if (data.cpf !== user.cpf) {
            await cpfExists(data.cpf);
        }
    }

    if (data.phone !== undefined) {
        validateRequired(data.phone, "telefone");

        if (!isValidPhone(data.phone)) {
            throwValidationError("Telefone inválido", 422);
        }

        data.phone = numberFormatReplace(data.phone);
    }

    if (data.password) {
        if (data.password.length < 6) {
            throwValidationError("A senha deve ter no mínimo 6 caracteres");
        }

        const isMatch = await bcrypt.compare(data.password, user.password);
        if (isMatch) {
            delete data.password;
        } else {
            data.password = await bcrypt.hash(data.password, 10);
            // Marca a troca de senha para revogar sessões emitidas antes desta data.
            data.passwordChangedAt = new Date();
        }
    }

    if (data.role !== undefined) {
        validateEnum(data.role, allowedRoles, "Role");

        if (data.role === "master" && actor.role !== "master") {
            throwValidationError("Apenas master pode definir role master", 403);
        }

        if (data.role === "master") {
            data.tenantId = null;
        }
    }

    if (data.tenantId !== undefined && data.role !== "master" && isEmpty(data.tenantId)) {
        throwValidationError("Usuários admin/user devem ter um tenantId");
    }

    if (data.tenantId !== undefined && data.tenantId && data.tenantId?.toString?.() !== user.tenantId?.toString?.()) {
        await checkTenantCapacity(data.tenantId, user._id);
    }

    validatePermissionStringArray(data.permissions, "permissions");
    validatePermissionStringArray(data.revokedPermissions, "revokedPermissions");
    await validatePermissionPreset(data, user, actor);

    data.permissions = sanitizePermissionArray(data.permissions);
    data.revokedPermissions = sanitizePermissionArray(data.revokedPermissions);

    if (data.address) {
        const currentAddress = user.address || {};

        addressFields.forEach((field) => {
            if (data.address[field] !== undefined && isValid(data.address[field], currentAddress[field])) {
                delete data.address[field];
            }
        });

        if (data.address.zipCode && !cepIsValid(data.address.zipCode)) {
            throwValidationError("CEP inválido", 422);
        }

        if (Object.keys(data.address).length === 0) {
            delete data.address;
        } else {
            data.address = { ...currentAddress, ...normalizeAddress(data.address) };
        }
    }

    if (data.isActive !== undefined && typeof data.isActive !== "boolean") {
        throwValidationError("isActive deve ser booleano");
    }
};

// Cria um novo usuário após validar os dados e permissões.
export const createUserService = async (data, actor) => {
    await validateCreate(data, actor);

    const user = await createUserRepo(data);

    await auditAction("user", "create", null, user, actor.id);

    return user;
};

// Retorna a lista paginada de usuários do tenant com filtros opcionais.
export const getUsersService = async (query, tenantId, includeDeleted = false) => {
    const { page, limit, skip } = getPagination(query);
    const sort = getSort(query);

    const filter = { ...baseQuery(tenantId, includeDeleted) };

    if (query.role) {
        filter.role = query.role;
    }

    if (query.isActive !== undefined) {
        filter.isActive = query.isActive === "true";
    }

    if (query.search) {
        const term = query.search.trim();
        filter.$or = [
            { name: { $regex: term, $options: "i" } },
            { email: { $regex: term.toLowerCase(), $options: "i" } },
        ];
    }

    const [users, total] = await Promise.all([
        getUsersRepo(filter, skip, limit, sort),
        countUsersRepo(filter),
    ]);

    return paginatedResponse(users, page, limit, total);
};

// Busca um usuário pelo ID respeitando o tenant e o soft delete.
export const getUserByIdService = (id, tenantId, includeDeleted = false) => {
    return getUserByIdRepo(id, tenantId, includeDeleted);
};

// Atualiza um usuário existente com validação de permissões.
export const updateUserService = async (id, data, actor) => {
    const user = await getUserByIdWithPasswordRepo(id, actor.tenantId, true);

    if (!user) {
        throwValidationError("Usuário não encontrado", 404);
    }

    if (actor.role !== "master" && user.tenantId?.toString?.() !== actor.tenantId?.toString?.()) {
        throwValidationError("Acesso negado a este usuário", 403);
    }

    if (user.role === "master" && actor.role !== "master") {
        throwValidationError("Apenas master pode alterar outro master", 403);
    }

    if (data.role && data.role !== user.role && actor.role !== "master") {
        throwValidationError("Apenas master pode alterar role", 403);
    }

    await validateUpdate(data, user, actor);

    if (Object.keys(data).length === 0) {
        throwValidationError("Nenhum campo válido para atualização");
    }

    const updatedUser = await updateUserRepo(id, data, actor.tenantId);

    await auditAction("user", "update", user, updatedUser, actor.id);

    return updatedUser;
};

// Realiza soft delete de um usuário, marcando o campo deletedAt.
export const softDeleteUserService = async (id, actor) => {
    const user = await getUserByIdRepo(id, actor.tenantId, false);

    if (!user) {
        throwValidationError("Usuário não encontrado", 404);
    }

    if (user.role === "master" && actor.role !== "master") {
        throwValidationError("Apenas master pode remover outro master", 403);
    }

    const deletedUser = await softDeleteUserRepo(id, actor.tenantId);

    await auditAction("user", "delete", user, deletedUser, actor.id);

    return deletedUser;
};

// Remove permanentemente um usuário do banco de dados. Restrito a master.
export const hardDeleteUserService = async (id, actor) => {
    if (actor.role !== "master") {
        throwValidationError("Apenas master pode fazer hard delete", 403);
    }

    const user = await getUserByIdWithPasswordRepo(id, null, true);

    if (!user) {
        throwValidationError("Usuário não encontrado", 404);
    }

    await auditAction("user", "delete", user, null, actor.id);

    return await hardDeleteUserRepo(id);
};

// Restaura um usuário excluído por soft delete. Restrito ao tenant.
export const restoreUserService = async (id, actor) => {
    const user = await getUserByIdRepo(id, actor.tenantId, true);

    if (!user) {
        throwValidationError("Usuário não encontrado", 404);
    }

    if (!user.deletedAt) {
        throwValidationError("Usuário não está removido", 400);
    }

    const restoredUser = await restoreUserRepo(id, actor.tenantId);

    await auditAction("user", "restore", user, restoredUser, actor.id);

    return restoredUser;
};
