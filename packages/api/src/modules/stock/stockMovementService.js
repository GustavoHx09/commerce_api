import {
    createStockMovementRepo,
    getStockMovementsRepo,
    countStockMovementsRepo,
    getStockMovementByIdRepo,
} from "./stockMovementRepo.js";
import { getProductByIdRepo, updateProductRepo } from "../product/productRepo.js";
import { baseQuery } from "../../shared/utils/repositoryHelpers.js";
import { isEmpty } from "../../shared/utils/fieldsValidations.js";
import { validateEnum, throwValidationError } from "../../shared/utils/serviceHelpers.js";
import { getPagination, getSort, paginatedResponse } from "../../shared/utils/paginationHelpers.js";
import { auditAction } from "../audit/auditHelpers.js";

const allowedTypes = ["in", "out", "adjust"];

// Calcula a nova quantidade em estoque com base no tipo de movimentação.
const calculateNewQuantity = (current, type, quantity) => {
    if (type === "in") return current + quantity;
    if (type === "out") return current - quantity;
    return quantity; // adjust: valor absoluto
};

// Valida os campos obrigatórios de uma movimentação.
const validateCreate = async (data, tenantId) => {
    validateEnum(data.type, allowedTypes, "Tipo de movimentação");

    if (isEmpty(data.productId)) {
        throwValidationError("O produto é obrigatório");
    }

    if (isNaN(data.quantity) || Number(data.quantity) < 0) {
        throwValidationError("A quantidade deve ser um número positivo");
    }

    const product = await getProductByIdRepo(data.productId, tenantId, false);

    if (!product) {
        throwValidationError("Produto não encontrado", 404);
    }

    const currentQuantity = Number(product.quantityInStock) || 0;
    const newQuantity = calculateNewQuantity(currentQuantity, data.type, Number(data.quantity));

    if (data.type === "out" && currentQuantity < Number(data.quantity)) {
        throwValidationError("Estoque insuficiente para a saída", 409);
    }

    return { product, currentQuantity, newQuantity };
};

// Registra uma nova movimentação de estoque e atualiza a quantidade do produto.
export const createStockMovementService = async (data, tenantId, actorId) => {
    const { product, currentQuantity, newQuantity } = await validateCreate(data, tenantId);

    await updateProductRepo(product._id, { quantityInStock: newQuantity }, tenantId);

    const movement = await createStockMovementRepo({
        tenantId,
        productId: product._id,
        type: data.type,
        quantity: Number(data.quantity),
        previousQuantity: currentQuantity,
        newQuantity,
        reason: String(data.reason || "").trim(),
        reference: String(data.reference || "").trim(),
        createdBy: actorId,
    });

    await auditAction("stock", "create", null, movement, actorId);

    return movement;
};

// Lista movimentações de estoque do tenant com paginação e filtros.
export const getStockMovementsService = async (query, tenantId) => {
    const { page, limit, skip } = getPagination(query);
    const sort = getSort(query, "createdAt");

    const filter = { ...baseQuery(tenantId, false) };

    if (query.productId) {
        filter.productId = query.productId;
    }

    if (query.type) {
        filter.type = query.type;
    }

    if (query.search) {
        const term = query.search.trim();
        filter.$or = [
            { reason: { $regex: term, $options: "i" } },
            { reference: { $regex: term, $options: "i" } },
        ];
    }

    const [movements, total] = await Promise.all([
        getStockMovementsRepo(filter, skip, limit, sort),
        countStockMovementsRepo(filter),
    ]);

    return paginatedResponse(movements, page, limit, total);
};

// Busca uma movimentação específica pelo ID dentro do tenant.
export const getStockMovementByIdService = (id, tenantId) => {
    return getStockMovementByIdRepo(id, tenantId);
};
