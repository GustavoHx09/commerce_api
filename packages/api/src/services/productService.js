import {
    createProductRepo,
    getProductsRepo,
    countProductsRepo,
    baseQuery,
    getProductByIdRepo,
    updateProductRepo,
    softDeleteProductRepo,
    hardDeleteProductRepo,
} from "../repositories/productRepo.js";
import { isEmpty } from "../utils/fieldsValidations.js";

const validateCreate = (data) => {
    const required = ["name", "price", "costPrice", "quantityInStock", "category"];
    const missing = required.filter((field) => isEmpty(data[field]));

    if (missing.length > 0) {
        throw { statusCode: 400, message: `AVISO: Campos obrigatórios faltando: ${missing.join(", ")}` };
    }

    const numericFields = {
        price: data.price,
        costPrice: data.costPrice,
        quantityInStock: data.quantityInStock,
    };

    for (const [field, value] of Object.entries(numericFields)) {
        if (isNaN(value) || Number(value) < 0) {
            throw { statusCode: 422, message: `AVISO: ${field} deve ser um número positivo` };
        }
    }

    data.price = Number(data.price);
    data.costPrice = Number(data.costPrice);
    data.quantityInStock = Number(data.quantityInStock);
};

const validateUpdate = (data) => {
    const fields = ["name", "description", "category"];

    fields.forEach((field) => {
        if (data[field] === "") {
            delete data[field];
        }
    });

    const numericFields = ["price", "costPrice", "quantityInStock"];

    numericFields.forEach((field) => {
        if (data[field] === null || data[field] === undefined) {
            delete data[field];
        } else if (isNaN(data[field]) || Number(data[field]) < 0) {
            throw { statusCode: 422, message: `AVISO: ${field} deve ser um número positivo` };
        } else {
            data[field] = Number(data[field]);
        }
    });

    if (Object.keys(data).length === 0) {
        throw { statusCode: 400, message: "AVISO: Nenhum campo válido para atualização" };
    }
};

export const createProductService = async (data, tenantId) => {
    validateCreate(data);
    data.tenantId = tenantId;
    return await createProductRepo(data);
};

export const getProductService = async (query, tenantId, includeDeleted = false) => {
    const { getPagination, getSort, paginatedResponse } = await import("../utils/paginationHelpers.js");
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

export const getProductByIdService = (id, tenantId, includeDeleted = false) => {
    return getProductByIdRepo(id, tenantId, includeDeleted);
};

export const updateProductService = async (id, data, tenantId) => {
    const product = await getProductByIdRepo(id, tenantId, false);

    if (!product) {
        throw { statusCode: 404, message: "AVISO: Produto não encontrado" };
    }

    validateUpdate(data);

    return await updateProductRepo(id, data, tenantId);
};

export const softDeleteProductService = async (id, tenantId) => {
    const product = await getProductByIdRepo(id, tenantId, false);

    if (!product) {
        throw { statusCode: 404, message: "AVISO: Produto não encontrado" };
    }

    return await softDeleteProductRepo(id, tenantId);
};

export const hardDeleteProductService = async (id, actor) => {
    if (actor.role !== "master") {
        throw { statusCode: 403, message: "AVISO: Apenas master pode fazer hard delete" };
    }

    return await hardDeleteProductRepo(id);
};
