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
import { hasPermission } from "../../shared/utils/permissionHelpers.js";
import { withTransaction } from "../../shared/utils/transactionHelpers.js";

const allowedTypes = ["in", "out", "adjust"];

// Calcula a nova quantidade em estoque com base no tipo de movimentação.
const calculateNewQuantity = (current, type, quantity) => {
    if (type === "in") return current + quantity;
    if (type === "out") return current - quantity;
    return quantity; // adjust: valor absoluto
};

// Permissão exigida por tipo de movimentação manual: suprimento (in) e
// retirada (out) exigem stock:supply; acerto de inventário exige stock:adjust.
const permissionByType = { in: "supply", out: "supply", adjust: "adjust" };

// Garante que o usuário tenha a permissão correspondente ao tipo da movimentação.
const ensureMovementPermission = (type, actor) => {
    if (!hasPermission(actor, "stock", permissionByType[type])) {
        throwValidationError("Permissão negada para esta movimentação de estoque", 403);
    }
};

// Valida os campos obrigatórios de uma movimentação.
const validateCreate = async (data, tenantId, session) => {
    if (isEmpty(data.productId)) {
        throwValidationError("O produto é obrigatório");
    }

    // Suprimento/retirada precisam de quantidade maior que zero; o acerto
    // aceita zero porque define o saldo final contado.
    const quantity = Number(data.quantity);
    if (isEmpty(data.quantity) || isNaN(quantity) || quantity < 0) {
        throwValidationError("A quantidade deve ser um número positivo");
    }
    if (data.type !== "adjust" && quantity === 0) {
        throwValidationError("A quantidade deve ser maior que zero");
    }

    // Toda movimentação manual exige motivo para garantir rastreabilidade.
    if (isEmpty(data.reason)) {
        throwValidationError("O motivo é obrigatório para movimentações de estoque");
    }

    const product = await getProductByIdRepo(data.productId, tenantId, false, { session });

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

// Registra uma movimentação manual de estoque (suprimento, retirada ou acerto)
// e atualiza o saldo do produto. Única porta de entrada para alterar o estoque
// fora das vendas: tudo ocorre em transação, gerando a movimentação e a
// auditoria tanto da movimentação quanto da alteração do saldo do produto.
export const createStockMovementService = async (data, tenantId, actor) => {
    // Valida o tipo antes da permissão para responder 400 a tipos inválidos.
    validateEnum(data.type, allowedTypes, "Tipo de movimentação");
    ensureMovementPermission(data.type, actor);

    return withTransaction(async (session) => {
        const { product, currentQuantity, newQuantity } = await validateCreate(data, tenantId, session);

        const updatedProduct = await updateProductRepo(product._id, { quantityInStock: newQuantity }, tenantId, { session });

        const movement = await createStockMovementRepo({
            tenantId,
            productId: product._id,
            type: data.type,
            quantity: Number(data.quantity),
            previousQuantity: currentQuantity,
            newQuantity,
            reason: String(data.reason).trim(),
            reference: String(data.reference || "").trim(),
            createdBy: actor.id,
        }, { session });

        await auditAction("stock", "create", null, movement, actor.id, { session });
        await auditAction("product", "update", product, updatedProduct, actor.id, { session });

        return movement;
    });
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
