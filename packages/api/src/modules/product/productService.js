import {
    createProductRepo,
    getProductsRepo,
    countProductsRepo,
    getProductByIdRepo,
    getProductBySkuRepo,
    updateProductRepo,
    softDeleteProductRepo,
    restoreProductRepo,
    hardDeleteProductRepo,
} from "./productRepo.js";
import { getCategoryByIdRepo } from "../category/categoryRepo.js";
import { countStockMovementsByProductRepo } from "../stock/stockMovementRepo.js";
import { countOrdersByProductRepo } from "../order/orderRepo.js";
import { isEmpty } from "../../shared/utils/fieldsValidations.js";
import { baseQuery } from "../../shared/utils/repositoryHelpers.js";
import { sanitizeNumberFields, throwValidationError } from "../../shared/utils/serviceHelpers.js";
import { getPagination, getSort, paginatedResponse } from "../../shared/utils/paginationHelpers.js";
import { auditAction } from "../audit/auditHelpers.js";

// Unidades de medida aceitas para produtos.
const VALID_UNITS = ["un", "kg", "g", "lt", "ml", "m", "cm", "par", "cx"];

// Campos obrigatórios na criação de um produto.
const requiredCreateFields = ["name", "price", "sku", "unit", "categoryId"];

// Campos numéricos que devem ser validados e convertidos.
const numericFields = ["price", "costPrice", "quantityInStock", "minStock"];

// Normaliza a unidade de medida para minúsculas e valida o valor.
const normalizeUnit = (unit) => {
    const normalized = String(unit || "un").toLowerCase().trim();

    if (!VALID_UNITS.includes(normalized)) {
        throwValidationError(`Unidade inválida. Valores aceitos: ${VALID_UNITS.join(", ")}`);
    }

    return normalized;
};

// Garante que a categoria exista, pertença ao tenant e não esteja excluída.
const validateCategory = async (categoryId, tenantId) => {
    if (isEmpty(categoryId)) return;

    const category = await getCategoryByIdRepo(categoryId, tenantId, false);

    if (!category) {
        throwValidationError("Categoria não encontrada", 404);
    }
};

// Garante que o SKU seja único por tenant, considerando produtos ativos.
const ensureSkuUnique = async (sku, tenantId, excludeId = null) => {
    if (isEmpty(sku)) return;

    const existing = await getProductBySkuRepo(String(sku).toUpperCase().trim(), tenantId);

    if (existing && (!excludeId || existing._id.toString() !== excludeId.toString())) {
        throwValidationError("SKU já cadastrado para este tenant", 409);
    }
};

// Valida os dados obrigatórios e regras de negócio na criação de um produto.
const validateCreate = async (data, tenantId) => {
    const missing = requiredCreateFields.filter((field) => isEmpty(data[field]));

    if (missing.length > 0) {
        throwValidationError(`Campos obrigatórios faltando: ${missing.join(", ")}`);
    }

    sanitizeNumberFields(data, numericFields);
    data.unit = normalizeUnit(data.unit);
    data.sku = String(data.sku).toUpperCase().trim();

    await validateCategory(data.categoryId, tenantId);
    await ensureSkuUnique(data.sku, tenantId);
};

// Valida os campos enviados na atualização de um produto.
const validateUpdate = async (data, product, tenantId) => {
    if (data.name === "") throwValidationError("O nome do produto é obrigatório");
    if (data.sku === "") throwValidationError("O SKU do produto é obrigatório");

    sanitizeNumberFields(data, numericFields);

    if (data.unit !== undefined) {
        data.unit = normalizeUnit(data.unit);
    }

    if (data.sku !== undefined) {
        data.sku = String(data.sku).toUpperCase().trim();
    }

    if (data.categoryId !== undefined) {
        await validateCategory(data.categoryId, tenantId);
    }

    if (data.sku !== undefined) {
        await ensureSkuUnique(data.sku, tenantId, product._id);
    }

    // Campos vazios de string não devem sobrescrever o documento.
    ["name", "description"].forEach((field) => {
        if (data[field] === "") delete data[field];
    });

    if (Object.keys(data).length === 0) {
        throwValidationError("Nenhum campo válido para atualização");
    }
};

// Cria um novo produto vinculado ao tenant.
export const createProductService = async (data, tenantId, actorId) => {
    await validateCreate(data, tenantId);
    data.tenantId = tenantId;

    const product = await createProductRepo(data);

    await auditAction("product", "create", null, product, actorId);

    return product;
};

// Retorna a lista paginada de produtos do tenant com filtros opcionais.
export const getProductsService = async (query, tenantId, includeDeleted = false) => {
    const { page, limit, skip } = getPagination(query);
    const sort = getSort(query, "name");

    const filter = { ...baseQuery(tenantId, includeDeleted) };

    if (query.categoryId) {
        filter.categoryId = query.categoryId;
    }

    if (query.minPrice) {
        filter.price = { $gte: Number(query.minPrice) };
    }

    if (query.maxPrice) {
        filter.price = { ...filter.price, $lte: Number(query.maxPrice) };
    }

    if (query.minStockAlert) {
        filter.$expr = { $lte: ["$quantityInStock", "$minStock"] };
    }

    if (query.search) {
        const term = query.search.trim();
        filter.$or = [
            { name: { $regex: term, $options: "i" } },
            { description: { $regex: term, $options: "i" } },
            { sku: { $regex: term, $options: "i" } },
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
export const updateProductService = async (id, data, tenantId, actorId) => {
    const product = await getProductByIdRepo(id, tenantId, false);

    if (!product) {
        throwValidationError("Produto não encontrado", 404);
    }

    await validateUpdate(data, product, tenantId);

    const updatedProduct = await updateProductRepo(id, data, tenantId);

    await auditAction("product", "update", product, updatedProduct, actorId);

    return updatedProduct;
};

// Realiza soft delete de um produto, marcando o campo deletedAt.
export const softDeleteProductService = async (id, tenantId, actorId) => {
    const product = await getProductByIdRepo(id, tenantId, false);

    if (!product) {
        throwValidationError("Produto não encontrado", 404);
    }

    const deletedProduct = await softDeleteProductRepo(id, tenantId);

    await auditAction("product", "delete", product, deletedProduct, actorId);

    return deletedProduct;
};

// Remove permanentemente um produto do banco de dados. Restrito a master.
export const hardDeleteProductService = async (id, actor) => {
    if (actor.role !== "master") {
        throwValidationError("Apenas master pode fazer hard delete", 403);
    }

    const product = await getProductByIdRepo(id, null, true);

    if (!product) {
        throwValidationError("Produto não encontrado", 404);
    }

    const [hasStockMovements, hasOrders] = await Promise.all([
        countStockMovementsByProductRepo(id),
        countOrdersByProductRepo(id),
    ]);

    if (hasStockMovements > 0 || hasOrders > 0) {
        throwValidationError("Não é possível excluir permanentemente um produto com histórico de movimentações ou vendas", 409);
    }

    await auditAction("product", "delete", product, null, actor.id);

    return await hardDeleteProductRepo(id);
};

// Restaura um produto excluído por soft delete. Restrito ao tenant.
export const restoreProductService = async (id, tenantId, actorId) => {
    const product = await getProductByIdRepo(id, tenantId, true);

    if (!product) {
        throwValidationError("Produto não encontrado", 404);
    }

    if (!product.deletedAt) {
        throwValidationError("Produto não está removido", 400);
    }

    const restoredProduct = await restoreProductRepo(id, tenantId);

    await auditAction("product", "restore", product, restoredProduct, actorId);

    return restoredProduct;
};

// Retorna produtos com estoque baixo (quantidade <= mínimo) do tenant.
export const getLowStockProductsService = async (query, tenantId) => {
    return getProductsService({ ...query, minStockAlert: "true" }, tenantId, false);
};
