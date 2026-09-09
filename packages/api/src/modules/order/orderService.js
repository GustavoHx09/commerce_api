import mongoose from "mongoose";
import { withTransaction } from "../../shared/utils/transactionHelpers.js";
import {
    createOrderRepo,
    getOrdersRepo,
    countOrdersRepo,
    getOrderByIdRepo,
    updateOrderRepo,
} from "./orderRepo.js";
import { decrementProductStockRepo, incrementProductStockRepo } from "../product/productRepo.js";
import { createStockMovementRepo } from "../stock/stockMovementRepo.js";
import { getCustomerByIdRepo } from "../customer/customerRepo.js";
import { getCashierByIdRepo } from "../cashier/cashierRepo.js";
import { createPaymentService, cancelPaymentsByOrderService } from "../payment/paymentService.js";
import { baseQuery } from "../../shared/utils/repositoryHelpers.js";
import { isEmpty } from "../../shared/utils/fieldsValidations.js";
import { throwValidationError } from "../../shared/utils/serviceHelpers.js";
import { getPagination, getSort, paginatedResponse } from "../../shared/utils/paginationHelpers.js";
import { auditAction } from "../audit/auditHelpers.js";

const INTEGER_UNITS = new Set(["un", "par"]);

// Gera um ObjectId para ser usado como _id do pedido antes de criar o pagamento.
const generateOrderId = () => new mongoose.Types.ObjectId();

// Verifica se a quantidade é compatível com a unidade do produto.
const validateQuantityByUnit = (quantity, unit) => {
    if (INTEGER_UNITS.has(unit) && !Number.isInteger(quantity)) {
        throwValidationError(`Quantidade de ${unit} deve ser um número inteiro`);
    }
};

// Valida o caixa informado: deve existir, pertencer ao tenant e estar aberto pelo usuário.
const validateCashier = async (cashierId, tenantId, actorId, session) => {
    const cashier = await getCashierByIdRepo(cashierId, tenantId, false, { session });

    if (!cashier) {
        throwValidationError("Caixa não encontrado", 404);
    }

    if (cashier.status !== "open") {
        throwValidationError("Caixa está fechado. Abra um caixa para realizar a venda", 409);
    }

    if (cashier.openedBy.toString() !== actorId) {
        throwValidationError("O caixa informado não pertence ao usuário atual", 403);
    }

    return cashier;
};

// Valida o cliente opcional.
const validateCustomer = async (customerId, tenantId, session) => {
    if (isEmpty(customerId)) return null;

    const customer = await getCustomerByIdRepo(customerId, tenantId, false, { session });

    if (!customer) {
        throwValidationError("Cliente não encontrado", 404);
    }

    return customer;
};

// Processa os itens do pedido, congela preços, decrementa estoque e cria movimentações.
const processOrderItems = async (items, tenantId, orderId, actorId, session) => {
    const processedItems = [];

    for (const item of items) {
        if (isEmpty(item.productId)) {
            throwValidationError("Todos os itens devem ter um produto");
        }

        const quantity = Number(item.quantity);
        if (isNaN(quantity) || quantity <= 0) {
            throwValidationError("Quantidade do item deve ser maior que zero");
        }

        const product = await decrementProductStockRepo(item.productId, tenantId, quantity, { session });

        if (!product) {
            throwValidationError("Estoque insuficiente ou produto não disponível", 409);
        }

        validateQuantityByUnit(quantity, product.unit);

        const unitPrice = Number(product.price);
        const itemDiscount = Number(item.discount || 0);
        const itemTotal = (unitPrice * quantity) - itemDiscount;

        if (itemDiscount < 0 || itemDiscount > unitPrice * quantity) {
            throwValidationError("Desconto do item não pode ser maior que o subtotal do item");
        }

        if (itemTotal < 0) {
            throwValidationError("Total do item não pode ser negativo");
        }

        processedItems.push({
            productId: product._id,
            name: product.name,
            sku: product.sku,
            unit: product.unit,
            quantity,
            unitPrice,
            discount: itemDiscount,
            total: itemTotal,
        });

        const newQuantity = Number(product.quantityInStock);
        const previousQuantity = newQuantity + quantity;

        await createStockMovementRepo({
            tenantId,
            productId: product._id,
            type: "out",
            quantity,
            previousQuantity,
            newQuantity,
            reason: "Venda PDV",
            reference: orderId.toString(),
            createdBy: actorId,
        }, { session });
    }

    return processedItems;
};

// Valida e cria o pagamento do pedido, calculando troco quando necessário.
const processPayment = async (payment, orderId, cashierId, tenantId, actorId, total, session) => {
    const VALID_METHODS = ["cash", "pix", "credit_card", "debit_card", "other"];

    if (!payment || !payment.method) {
        throwValidationError("Forma de pagamento é obrigatória");
    }

    if (!VALID_METHODS.includes(payment.method)) {
        throwValidationError("Forma de pagamento inválida");
    }

    const amountPaid = Number(payment.amount);
    if (isNaN(amountPaid) || amountPaid < 0) {
        throwValidationError("Valor pago deve ser um número positivo ou zero");
    }

    let change = 0;

    if (payment.method === "cash") {
        if (amountPaid < total) {
            throwValidationError("Valor pago em dinheiro não pode ser menor que o total");
        }
        change = amountPaid - total;
    } else {
        if (amountPaid !== total) {
            throwValidationError(`Valor pago deve ser igual ao total para ${payment.method}`);
        }
    }

    const createdPayment = await createPaymentService({
        orderId,
        cashierId,
        amount: amountPaid,
        method: payment.method,
        reference: payment.reference ? String(payment.reference).trim() : null,
    }, tenantId, actorId, { session });

    return { amountPaid, change, paymentId: createdPayment._id };
};

// Cria um pedido de venda (PDV) com baixa de estoque, pagamento e auditoria em transação.
export const createOrderService = async (data, tenantId, actorId) => {
    return withTransaction(async (session) => {
        await validateCashier(data.cashierId, tenantId, actorId, session);
        await validateCustomer(data.customerId, tenantId, session);

        if (!Array.isArray(data.items) || data.items.length === 0) {
            throwValidationError("Pedido deve conter pelo menos um item");
        }

        const orderId = generateOrderId();

        const processedItems = await processOrderItems(data.items, tenantId, orderId, actorId, session);

        const subtotal = processedItems.reduce((sum, item) => sum + item.total, 0);
        const orderDiscount = Number(data.discount || 0);
        const total = subtotal - orderDiscount;

        if (orderDiscount < 0 || orderDiscount > subtotal) {
            throwValidationError("Desconto do pedido não pode ser maior que o subtotal");
        }

        if (total < 0) {
            throwValidationError("Total do pedido não pode ser negativo");
        }

        const { amountPaid, change, paymentId } = await processPayment(
            data.payment,
            orderId,
            data.cashierId,
            tenantId,
            actorId,
            total,
            session
        );

        const order = await createOrderRepo({
            _id: orderId,
            tenantId,
            customerId: data.customerId || null,
            cashierId: data.cashierId,
            items: processedItems,
            discount: orderDiscount,
            total,
            amountPaid,
            change,
            status: "paid",
            paymentIds: [paymentId],
            observations: data.observations ? String(data.observations).trim() : null,
            createdBy: actorId,
        }, { session });

        await auditAction("order", "create", null, order, actorId, { session });

        return order;
    });
};

// Lista pedidos do tenant com paginação e filtros.
export const getOrdersService = async (query, tenantId, includeDeleted = false) => {
    const { page, limit, skip } = getPagination(query);
    const sort = getSort(query, "createdAt");

    const filter = { ...baseQuery(tenantId, includeDeleted) };

    if (query.customerId) filter.customerId = query.customerId;
    if (query.cashierId) filter.cashierId = query.cashierId;
    if (query.status) filter.status = query.status;

    if (query.search) {
        const term = query.search.trim();
        filter.$or = [
            { "items.name": { $regex: term, $options: "i" } },
            { "items.sku": { $regex: term, $options: "i" } },
        ];
    }

    const [data, total] = await Promise.all([
        getOrdersRepo(filter, skip, limit, sort),
        countOrdersRepo(filter),
    ]);

    return paginatedResponse(data, page, limit, total);
};

// Busca um pedido pelo ID.
export const getOrderByIdService = (id, tenantId, includeDeleted = false) => {
    return getOrderByIdRepo(id, tenantId, includeDeleted);
};

// Cancela um pedido, estorna estoque (quando possível), cancela pagamentos e audita.
export const cancelOrderService = async (id, data, tenantId, actorId) => {
    return withTransaction(async (session) => {
        const previous = await getOrderByIdRepo(id, tenantId, false, { session });

        if (!previous) {
            throwValidationError("Pedido não encontrado", 404);
        }

        if (previous.status === "canceled") {
            throwValidationError("Pedido já está cancelado", 409);
        }

        if (previous.status !== "paid") {
            throwValidationError("Apenas pedidos pagos podem ser cancelados", 409);
        }

        for (const item of previous.items) {
            const product = await incrementProductStockRepo(item.productId, tenantId, item.quantity, { session });

            if (product) {
                const previousQuantity = Number(product.quantityInStock) - item.quantity;
                const newQuantity = Number(product.quantityInStock);

                await createStockMovementRepo({
                    tenantId,
                    productId: product._id,
                    type: "in",
                    quantity: item.quantity,
                    previousQuantity,
                    newQuantity,
                    reason: "Cancelamento de venda",
                    reference: id.toString(),
                    createdBy: actorId,
                }, { session });
            } else {
                // Produto não encontrado (hard delete ou inativo): registra alerta e continua o cancelamento.
                await auditAction(
                    "orderItem",
                    "cancel_restore_skipped",
                    item,
                    null,
                    actorId,
                    { session }
                );
            }
        }

        await cancelPaymentsByOrderService(id, tenantId, actorId, { session });

        const updated = await updateOrderRepo(
            id,
            {
                status: "canceled",
                canceledAt: new Date(),
                canceledBy: actorId,
                cancelReason: data.cancelReason ? String(data.cancelReason).trim() : null,
            },
            tenantId,
            { session }
        );

        await auditAction("order", "update", previous, updated, actorId, { session });

        return updated;
    });
};
