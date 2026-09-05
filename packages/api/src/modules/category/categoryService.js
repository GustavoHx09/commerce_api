import {
    createCategoryRepo,
    getCategoriesRepo,
    countCategoriesRepo,
    getCategoryByIdRepo,
    updateCategoryRepo,
    softDeleteCategoryRepo,
    restoreCategoryRepo,
    hardDeleteCategoryRepo,
} from "./categoryRepo.js";
import products from "../product/productModel.js";
import { baseQuery } from "../../shared/utils/repositoryHelpers.js";
import { validateRequired, throwValidationError } from "../../shared/utils/serviceHelpers.js";
import { getPagination, getSort, paginatedResponse } from "../../shared/utils/paginationHelpers.js";
import { auditAction } from "../audit/auditHelpers.js";

// Valida os dados obrigatórios na criação de uma categoria.
const validateCreate = (data) => {
    validateRequired(data.name, "nome");

    if (String(data.name).trim().length === 0) {
        throwValidationError("O nome da categoria é obrigatório");
    }
};

// Valida os dados enviados na atualização de uma categoria.
const validateUpdate = (data) => {
    if (data.name !== undefined) {
        validateRequired(data.name, "nome");

        if (String(data.name).trim().length === 0) {
            throwValidationError("O nome da categoria é obrigatório");
        }
    }

    if (data.isActive !== undefined && typeof data.isActive !== "boolean") {
        throwValidationError("isActive deve ser booleano");
    }

    if (Object.keys(data).length === 0) {
        throwValidationError("Nenhum campo válido para atualização");
    }
};

// Garante que a categoria não esteja vinculada a produtos ativos antes de excluir.
const ensureCategoryNotInUse = async (id, tenantId) => {
    const count = await products.countDocuments({
        categoryId: id,
        tenantId,
        deletedAt: null,
    });

    if (count > 0) {
        throwValidationError("Categoria possui produtos ativos e não pode ser removida", 409);
    }
};

// Cria uma nova categoria vinculada ao tenant.
export const createCategoryService = async (data, tenantId, actorId) => {
    validateCreate(data);

    const category = await createCategoryRepo({
        tenantId,
        name: String(data.name).trim(),
        description: String(data.description || "").trim(),
        isActive: data.isActive !== false,
    });

    await auditAction("category", "create", null, category, actorId);

    return category;
};

// Retorna categorias do tenant com paginação e filtros.
export const getCategoriesService = async (query, tenantId, includeDeleted = false) => {
    const { page, limit, skip } = getPagination(query);
    const sort = getSort(query, "name");

    const filter = { ...baseQuery(tenantId, includeDeleted) };

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

    const [data, total] = await Promise.all([
        getCategoriesRepo(filter, skip, limit, sort),
        countCategoriesRepo(filter),
    ]);

    return paginatedResponse(data, page, limit, total);
};

// Busca uma categoria pelo ID respeitando tenant e soft delete.
export const getCategoryByIdService = (id, tenantId, includeDeleted = false) => {
    return getCategoryByIdRepo(id, tenantId, includeDeleted);
};

// Atualiza uma categoria existente do tenant.
export const updateCategoryService = async (id, data, tenantId, actorId) => {
    const previous = await getCategoryByIdRepo(id, tenantId, false);

    if (!previous) {
        throwValidationError("Categoria não encontrada", 404);
    }

    validateUpdate(data);

    const sanitized = {};

    if (data.name !== undefined) sanitized.name = String(data.name).trim();
    if (data.description !== undefined) sanitized.description = String(data.description).trim();
    if (data.isActive !== undefined) sanitized.isActive = data.isActive;

    const category = await updateCategoryRepo(id, sanitized, tenantId);

    await auditAction("category", "update", previous, category, actorId);

    return category;
};

// Realiza soft delete de uma categoria, desde que não possua produtos ativos.
export const softDeleteCategoryService = async (id, tenantId, actorId) => {
    const previous = await getCategoryByIdRepo(id, tenantId, false);

    if (!previous) {
        throwValidationError("Categoria não encontrada", 404);
    }

    await ensureCategoryNotInUse(id, tenantId);

    const category = await softDeleteCategoryRepo(id, tenantId);

    await auditAction("category", "delete", previous, category, actorId);

    return category;
};

// Remove permanentemente uma categoria do banco de dados. Restrito a master.
export const hardDeleteCategoryService = async (id, actor) => {
    if (actor.role !== "master") {
        throwValidationError("Apenas master pode fazer hard delete", 403);
    }

    const category = await getCategoryByIdRepo(id, null, true);

    if (!category) {
        throwValidationError("Categoria não encontrada", 404);
    }

    await auditAction("category", "delete", category, null, actor.id);

    return await hardDeleteCategoryRepo(id);
};

// Restaura uma categoria excluída por soft delete.
export const restoreCategoryService = async (id, tenantId, actorId) => {
    const previous = await getCategoryByIdRepo(id, tenantId, true);

    if (!previous) {
        throwValidationError("Categoria não encontrada", 404);
    }

    if (!previous.deletedAt) {
        throwValidationError("Categoria não está removida", 400);
    }

    const category = await restoreCategoryRepo(id, tenantId);

    await auditAction("category", "restore", previous, category, actorId);

    return category;
};
