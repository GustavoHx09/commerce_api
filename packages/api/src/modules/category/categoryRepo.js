import categories from "./categoryModel.js";
import { baseQuery } from "../../shared/utils/repositoryHelpers.js";

// Cria uma nova categoria no banco de dados.
export const createCategoryRepo = (data) => categories.create(data);

// Retorna categorias paginadas com base no filtro.
export const getCategoriesRepo = (filter, skip, limit, sort) =>
    categories.find(filter).skip(skip).limit(limit).sort(sort);

// Conta categorias que satisfazem o filtro.
export const countCategoriesRepo = (filter) => categories.countDocuments(filter);

// Busca uma categoria pelo ID dentro do tenant e considerando soft delete.
export const getCategoryByIdRepo = (id, tenantId, includeDeleted = false) =>
    categories.findOne({ _id: id, ...baseQuery(tenantId, includeDeleted) });

// Atualiza uma categoria do tenant e retorna o documento atualizado.
export const updateCategoryRepo = (id, data, tenantId) =>
    categories.findOneAndUpdate(
        { _id: id, ...baseQuery(tenantId, false) },
        data,
        { new: true }
    );

// Realiza soft delete de uma categoria do tenant, definindo deletedAt.
export const softDeleteCategoryRepo = (id, tenantId) =>
    categories.findOneAndUpdate(
        { _id: id, ...baseQuery(tenantId, false) },
        { deletedAt: new Date() },
        { new: true }
    );

// Restaura uma categoria previamente excluída por soft delete.
export const restoreCategoryRepo = (id, tenantId) =>
    categories.findOneAndUpdate(
        { _id: id, ...baseQuery(tenantId, true) },
        { deletedAt: null },
        { new: true }
    );

// Remove permanentemente uma categoria do banco de dados.
export const hardDeleteCategoryRepo = (id) => categories.findByIdAndDelete(id);
