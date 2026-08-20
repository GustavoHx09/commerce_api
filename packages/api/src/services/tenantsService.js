import {
    createTenantRepo,
    getTenantsRepo,
    countTenantsRepo,
    getTenantByIdRepo,
    getTenantBySlugRepo,
    updateTenantRepo,
    deleteTenantRepo,
} from "../repositories/tenantsRepo.js";
import { isEmpty, isValid, generateSlug } from "../utils/fieldsValidations.js";

// Valida os dados mínimos para criação de um tenant.
const validateTenantData = (data) => {
    if (isEmpty(data.name)) {
        const error = new Error("AVISO: O nome é obrigatório");
        error.statusCode = 400;
        throw error;
    }
};

// Gera um slug único a partir do nome, adicionando um sufixo numérico caso já exista.
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

// Cria um tenant gerando automaticamente o slug a partir do nome.
export const createTenantService = async (data) => {
    validateTenantData(data);

    const baseSlug = generateSlug(data.name);
    data.slug = await generateUniqueSlug(baseSlug);

    return await createTenantRepo(data);
};

// Retorna a lista paginada de tenants com filtros opcionais.
export const getTenantsService = async (query = {}) => {
    const { getPagination, getSort, paginatedResponse } = await import("../utils/paginationHelpers.js");
    const { page, limit, skip } = getPagination(query);
    const sort = getSort(query, "name");

    const filter = {};

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
        const error = new Error("AVISO: Tenant não encontrado");
        error.statusCode = 404;
        throw error;
    }

    return tenant;
};

// Atualiza um tenant, regenerando o slug automaticamente se o nome for alterado.
export const updateTenantService = async (id, data) => {
    const tenant = await getTenantByIdRepo(id);

    if (!tenant) {
        const error = new Error("AVISO: Tenant não encontrado");
        error.statusCode = 404;
        throw error;
    }

    if (isValid(data.name, tenant.name)) {
        delete data.name;
    } else if (data.name) {
        const baseSlug = generateSlug(data.name);
        data.slug = await generateUniqueSlug(baseSlug, id);
    }

    if (isValid(data.isActive, tenant.isActive)) {
        delete data.isActive;
    }

    if (data.slug && isValid(data.slug, tenant.slug)) {
        delete data.slug;
    } else if (data.slug) {
        const existing = await getTenantBySlugRepo(data.slug);
        if (existing && existing._id.toString() !== id) {
            const error = new Error("AVISO: Slug já cadastrado");
            error.statusCode = 400;
            throw error;
        }
    }

    return await updateTenantRepo(id, data);
};

// Remove permanentemente um tenant do banco de dados.
export const deleteTenantService = async (id) => {
    const tenant = await getTenantByIdRepo(id);

    if (!tenant) {
        const error = new Error("AVISO: Tenant não encontrado");
        error.statusCode = 404;
        throw error;
    }

    return await deleteTenantRepo(id);
};
