import {
    createProductRepo,
    getProductsRepo,
    countProductsRepo,
    getProductByIdRepo,
    updateProductRepo,
    softDeleteProductRepo,
    hardDeleteProductRepo,
} from "../repositories/productRepo.js";
import { isEmpty } from "../utils/fieldsValidations.js";
import { baseQuery } from "../utils/repositoryHelpers.js";
import {
    sanitizeNumberFields,
    throwValidationError,
} from "../utils/serviceHelpers.js";
import { getPagination, getSort, paginatedResponse } from "../utils/paginationHelpers.js";

// Campos obrigatórios na criação de um produto.
const requiredCreateFields = ["name", "price", "costPrice", "quantityInStock", "category"];

// Campos numéricos que devem ser validados e convertidos.
const numericFields = ["price", "costPrice", "quantityInStock"];

// Garante que todos os campos obrigatórios estejam presentes na criação.
const validateCreate = (data) => {
    const missing = requiredCreateFields.filter((field) => isEmpty(data[field]));

    if (missing.length > 0) {
        throwValidationError(`Campos obrigatórios faltando: ${missing.join(", ")}`);
    }

    sanitizeNumberFields(data, numericFields);
};

// Valida os campos enviados na atualização de um produto.
const validateUpdate = (data) => {
    const textFields = ["name", "description", "category"];

    textFields.forEach((field) => {
        if (data[field] === "") {
            delete data[field];
        }
    });

    sanitizeNumberFields(data, numericFields);

    if (Object.keys(data).length === 0) {
        throwValidationError("Nenhum campo válido para atualização");
    }
};

// Cria um novo produto vinculado ao tenant.
export const createProductService = async (data, tenantId) => {
    validateCreate(data);
    data.tenantId = tenantId;
    return await createProductRepo(data);
};

// Retorna a lista paginada de produtos do tenant com filtros opcionais.
export const getProductsService = async (query, tenantId, includeDeleted = false) => {
    const { page, limit, skip } = getPagination(query);
    const sort = getSort(query, "name");

    const filter = { ...baseQuery(tenantId, includeDeleted) };

    if (query.category) {
        filter.category = { $regex: query.category, $options: "i" };
    }

    if (query.minPrice) {
        filter.price = { $gte: Number(query.minPrice) };
    }

    if (query.maxPrice) {
        filter.price = { ...filter.price, $lte: Number(query.maxPrice) };
    }

    if (query.search) {
        const term = query.search.trim();
        filter.$or = [
            { name: { $regex: term, $options: "i" } },
            { description: { $regex: term, $options: "i" } },
        ];
    }

    const [products, total] = await Promise.all([
        getProductsRepo(filter, skip, limit, sort),
        countProductsRepo(filter),
    ]);

    return paginatedResponse(products, page, limit, total);
};

// Busca um produto pelo ID respeitando o tenant e o soft delete.
export const getProductByIdService = (id, tenantId, includeDeleted = false) => {
    return getProductByIdRepo(id, tenantId, includeDeleted);
};

// Atualiza um produto existente do tenant.
export const updateProductService = async (id, data, tenantId) => {
    const product = await getProductByIdRepo(id, tenantId, false);

    if (!product) {
        throwValidationError("Produto não encontrado", 404);
    }

    validateUpdate(data);

    return await updateProductRepo(id, data, tenantId);
};

// Realiza soft delete de um produto, marcando o campo deletedAt.
export const softDeleteProductService = async (id, tenantId) => {
    const product = await getProductByIdRepo(id, tenantId, false);

    if (!product) {
        throwValidationError("Produto não encontrado", 404);
    }

    return await softDeleteProductRepo(id, tenantId);
};

// Remove permanentemente um produto do banco de dados. Restrito a master.
export const hardDeleteProductService = async (id, actor) => {
    if (actor.role !== "master") {
        throwValidationError("Apenas master pode fazer hard delete", 403);
    }

    return await hardDeleteProductRepo(id);
};
