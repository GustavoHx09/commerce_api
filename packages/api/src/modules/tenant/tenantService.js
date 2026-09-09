import {
    createTenantRepo,
    getTenantsRepo,
    countTenantsRepo,
    getTenantByIdRepo,
    getTenantBySlugRepo,
    getTenantByDocumentRepo,
    updateTenantRepo,
    softDeleteTenantRepo,
    restoreTenantRepo,
} from "./tenantRepo.js";
import { isEmpty, isValid, generateSlug, isValidDocument, isValidPhone, cepIsValid, emailIsValid, formatDocument } from "../../shared/utils/fieldsValidations.js";
import { throwValidationError, validateRequired } from "../../shared/utils/serviceHelpers.js";
import { getPagination, getSort, paginatedResponse } from "../../shared/utils/paginationHelpers.js";
import { saveLogoFile } from "../../shared/utils/upload/storageService.js";
import { auditAction } from "../audit/auditHelpers.js";

const addressFields = ["number", "street", "neighborhood", "zipCode", "complement", "city", "state"];

const planLimits = { free: 2, basic: 10, pro: 100 };

// Campos que a própria empresa pode alterar através de /tenants/me.
const ownTenantEditableFields = ["name", "displayName", "phone", "email", "address", "logoUrl", "colors"];

// Valida uma cor no formato hexadecimal de 6 dígitos.
const isValidHexColor = (color) => {
    if (isEmpty(color)) return false;
    return /^#[0-9A-Fa-f]{6}$/.test(color);
};

// Valida se a URL do logo aponta para uma imagem segura.
const isValidLogoUrl = (url) => {
    if (isEmpty(url)) return true; // opcional
    if (typeof url !== "string") return false;
    const safeImageRegex = /\.(png|jpg|jpeg|svg|webp)(\?.*)?$/i;
    const safeProtocol = /^https?:\/\//i;
    return safeProtocol.test(url) && safeImageRegex.test(url);
};

// Normaliza o objeto de endereço, convertendo campos vazios em null.
const normalizeAddress = (address) => {
    if (!address) return null;

    const normalized = {};
    addressFields.forEach((field) => {
        normalized[field] = isEmpty(address[field]) ? null : address[field];
    });
    return normalized;
};

// Valida os dados mínimos e regras de negócio na criação/atualização de um tenant.
const validateTenantData = async (data, currentTenant = null) => {
    validateRequired(data.name, "nome");

    if (!data.documentType || !["cpf", "cnpj"].includes(data.documentType)) {
        throwValidationError("Tipo de documento deve ser cpf ou cnpj", 422);
    }

    if (!isValidDocument(data.document, data.documentType)) {
        throwValidationError("Documento inválido", 422);
    }

    const cleanedDocument = formatDocument(data.document);
    if (!currentTenant || formatDocument(currentTenant.document) !== cleanedDocument) {
        const existingDocument = await getTenantByDocumentRepo(cleanedDocument);
        if (existingDocument) {
            throwValidationError("Documento já cadastrado", 400);
        }
    }

    data.document = cleanedDocument;

    if (!isValidPhone(data.phone)) {
        throwValidationError("Telefone inválido", 422);
    }

    if (!emailIsValid(data.email)) {
        throwValidationError("Email inválido", 422);
    }

    if (data.address?.zipCode && !cepIsValid(data.address.zipCode)) {
        throwValidationError("CEP inválido", 422);
    }

    if (data.plan && !["free", "basic", "pro"].includes(data.plan)) {
        throwValidationError("Plano inválido", 422);
    }
};

// Gera um slug único a partir do nome, adicionando sufixo numérico se necessário.
const generateUniqueSlug = async (baseSlug, currentId = null) => {
    let slug = baseSlug;
    let counter = 1;

    while (true) {
        const existing = await getTenantBySlugRepo(slug);

        if (!existing) return slug;
        if (currentId && existing._id.toString() === currentId) return slug;

        slug = `${baseSlug}-${counter}`;
        counter += 1;
    }
};

// Cria um tenant após validar documento, slug e dados de contato.
export const createTenantService = async (data, actorId) => {
    await validateTenantData(data);

    data.slug = await generateUniqueSlug(generateSlug(data.name));
    data.address = normalizeAddress(data.address);
    data.maxUsers = planLimits[data.plan] ?? planLimits.free;

    const tenant = await createTenantRepo(data);

    await auditAction("tenant", "create", null, tenant, actorId);

    return tenant;
};

// Retorna a lista paginada de tenants com filtros opcionais.
export const getTenantsService = async (query = {}) => {
    const { page, limit, skip } = getPagination(query);
    const sort = getSort(query, "name");

    const filter = { deletedAt: null };

    if (query.isActive !== undefined) {
        filter.isActive = query.isActive === "true";
    }

    if (query.search) {
        const term = query.search.trim();
        filter.$or = [
            { name: { $regex: term, $options: "i" } },
            { slug: { $regex: term, $options: "i" } },
        ];
    }

    const [tenants, total] = await Promise.all([
        getTenantsRepo(filter, skip, limit, sort),
        countTenantsRepo(filter),
    ]);

    return paginatedResponse(tenants, page, limit, total);
};

// Busca um tenant pelo ID.
export const getTenantByIdService = async (id) => {
    const tenant = await getTenantByIdRepo(id);

    if (!tenant) {
        throwValidationError("Tenant não encontrado", 404);
    }

    return tenant;
};

// Atualiza um tenant, regenerando slug e validando documento quando necessário.
export const updateTenantService = async (id, data, actorId) => {
    const tenant = await getTenantByIdRepo(id);

    if (!tenant) {
        throwValidationError("Tenant não encontrado", 404);
    }

    if (data.name !== undefined && isEmpty(data.name)) {
        throwValidationError("O nome é obrigatório");
    }

    if (data.name && !isValid(data.name, tenant.name)) {
        data.slug = await generateUniqueSlug(generateSlug(data.name), id);
    }

    if (data.address) {
        data.address = { ...tenant.address?.toObject?.() || tenant.address, ...normalizeAddress(data.address) };
    }

    if (data.document || data.documentType || data.phone || data.email || data.plan) {
        const mergedData = { ...tenant.toObject(), ...data };
        await validateTenantData(mergedData, tenant);

        if (data.document) {
            data.document = mergedData.document;
        }
    }

    if (data.plan && data.plan !== tenant.plan) {
        data.maxUsers = planLimits[data.plan] ?? planLimits.free;
    }

    const updatedTenant = await updateTenantRepo(id, data);

    await auditAction("tenant", "update", tenant, updatedTenant, actorId);

    return updatedTenant;
};

// Realiza soft delete do tenant, desativando-o para evitar novos vínculos.
export const deleteTenantService = async (id, actorId) => {
    const tenant = await getTenantByIdRepo(id);

    if (!tenant) {
        throwValidationError("Tenant não encontrado", 404);
    }

    const deletedTenant = await softDeleteTenantRepo(id);

    await auditAction("tenant", "delete", tenant, deletedTenant, actorId);

    return deletedTenant;
};

// Remove campos que a própria empresa não pode alterar.
const filterOwnTenantData = (data) => {
    const filtered = {};

    for (const field of ownTenantEditableFields) {
        if (data[field] !== undefined) {
            filtered[field] = data[field];
        }
    }

    return filtered;
};

// Valida os dados de branding e contato permitidos para edição própria.
const validateOwnTenantData = (data) => {
    if (data.displayName !== undefined && !isEmpty(data.displayName) && data.displayName.length > 120) {
        throwValidationError("Nome de exibição deve ter no máximo 120 caracteres", 422);
    }

    if (data.colors !== undefined) {
        if (data.colors.primary !== undefined && !isValidHexColor(data.colors.primary)) {
            throwValidationError("Cor primária inválida. Use formato hexadecimal como #2563eb", 422);
        }

        if (data.colors.secondary !== undefined && !isValidHexColor(data.colors.secondary)) {
            throwValidationError("Cor secundária inválida. Use formato hexadecimal como #1e40af", 422);
        }
    }

    if (data.logoUrl !== undefined && !isValidLogoUrl(data.logoUrl)) {
        throwValidationError("URL do logo inválida. Deve ser uma imagem (png, jpg, svg, webp) em http/https", 422);
    }
};

// Atualiza os dados da própria empresa, impedindo mudanças em plano, documento e status.
export const updateOwnTenantService = async (id, data, actorId) => {
    const filtered = filterOwnTenantData(data);
    validateOwnTenantData(filtered);

    if (Object.keys(filtered).length === 0) {
        throwValidationError("Nenhum campo válido para atualização");
    }

    return await updateTenantService(id, filtered, actorId);
};

// Restaura um tenant previamente excluído por soft delete. Restrito a master.
export const restoreTenantService = async (id, actorId) => {
    const tenant = await getTenantByIdRepo(id, true);

    if (!tenant) {
        throwValidationError("Tenant não encontrado", 404);
    }

    if (!tenant.deletedAt) {
        throwValidationError("Tenant não está removido", 400);
    }

    const restoredTenant = await restoreTenantRepo(id);

    await auditAction("tenant", "restore", tenant, restoredTenant, actorId);

    return restoredTenant;
};

// Faz upload da logo da empresa, salva em disco e atualiza o tenant.
export const uploadTenantLogoService = async (id, file, baseUrl, actorId) => {
    if (!file) {
        throwValidationError("Nenhuma imagem enviada");
    }

    const { relativePath } = saveLogoFile(id, file.buffer, file.mimetype);
    const logoUrl = `${baseUrl}/${relativePath}`;

    const tenant = await getTenantByIdRepo(id);

    if (!tenant) {
        throwValidationError("Tenant não encontrado", 404);
    }

    const updatedTenant = await updateTenantRepo(id, { logoUrl });

    await auditAction("tenant", "update", tenant, updatedTenant, actorId);

    return updatedTenant;
};
