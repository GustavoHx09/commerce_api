import {
    createCategoryService,
    getCategoriesService,
    getCategoryByIdService,
    updateCategoryService,
    softDeleteCategoryService,
    hardDeleteCategoryService,
    restoreCategoryService,
} from "./categoryService.js";
import { successResponse } from "../../shared/utils/responseHelpers.js";
import { ensureFound } from "../../shared/utils/controllerHelpers.js";

// Cria uma nova categoria vinculada ao tenant atual.
export const createCategory = async (req, res) => {
    const category = await createCategoryService(req.body, req.tenantId, req.user.id);
    return successResponse(res, { category }, "Categoria criada com sucesso", 201);
};

// Lista categorias do tenant atual com paginação e filtros.
export const getCategories = async (req, res) => {
    const includeDeleted = req.user.role === "master" && req.query.includeDeleted === "true";
    const result = await getCategoriesService(req.query, req.tenantId, includeDeleted);
    return successResponse(res, result, "Categorias listadas com sucesso");
};

// Busca uma categoria específica pelo ID dentro do tenant atual.
export const getCategoryById = async (req, res) => {
    const includeDeleted = req.user.role === "master" && req.query.includeDeleted === "true";
    const category = await getCategoryByIdService(req.params.id, req.tenantId, includeDeleted);
    ensureFound(category, "Categoria");
    return successResponse(res, { category }, "Categoria encontrada com sucesso");
};

// Atualiza os dados de uma categoria existente.
export const updateCategory = async (req, res) => {
    const category = await updateCategoryService(req.params.id, req.body, req.tenantId, req.user.id);
    return successResponse(res, { category }, "Categoria atualizada com sucesso");
};

// Realiza soft delete de uma categoria do tenant atual.
export const softDeleteCategory = async (req, res) => {
    const category = await softDeleteCategoryService(req.params.id, req.tenantId, req.user.id);
    return successResponse(res, { category }, "Categoria removida com sucesso");
};

// Realiza hard delete permanente de uma categoria. Restrito a master.
export const hardDeleteCategory = async (req, res) => {
    await hardDeleteCategoryService(req.params.id, req.user);
    return successResponse(res, null, "Categoria deletada permanentemente");
};

// Restaura uma categoria previamente removida por soft delete.
export const restoreCategory = async (req, res) => {
    const category = await restoreCategoryService(req.params.id, req.tenantId, req.user.id);
    return successResponse(res, { category }, "Categoria restaurada com sucesso");
};
