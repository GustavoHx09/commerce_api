import { createPaymentRepo, getPaymentsRepo, countPaymentsRepo, getPaymentByIdRepo, cancelPaymentsByOrderRepo } from "./paymentRepo.js";
import { baseQuery } from "../../shared/utils/repositoryHelpers.js";
import { throwValidationError } from "../../shared/utils/serviceHelpers.js";
import { getPagination, getSort, paginatedResponse } from "../../shared/utils/paginationHelpers.js";

const VALID_METHODS = ["cash", "pix", "credit_card", "debit_card", "other"];

// Cria um pagamento vinculado a um pedido. Deve ser chamado dentro de uma transação externa.
// Para credit_card, installments é obrigatório; juros e identificadores da maquininha são opcionais.
export const createPaymentService = async (data, tenantId, actorId, { session } = {}) => {
    if (!VALID_METHODS.includes(data.method)) {
        throwValidationError("Forma de pagamento inválida");
    }

    const amount = Number(data.amount);
    if (isNaN(amount) || amount < 0) {
        throwValidationError("Valor do pagamento deve ser um número positivo ou zero");
    }

    let installments = null;
    if (data.method === "credit_card") {
        installments = Number(data.installments);
        if (!Number.isInteger(installments) || installments < 1 || installments > 48) {
            throwValidationError("Parcelas do cartão de crédito devem ser inteiras entre 1 e 48");
        }
    }

    const interestPercent = Number(data.interestPercent || 0);
    const interestAmount = Number(data.interestAmount || 0);
    if (interestPercent < 0 || interestAmount < 0 || isNaN(interestPercent) || isNaN(interestAmount)) {
        throwValidationError("Juros do pagamento inválidos");
    }

    const payment = await createPaymentRepo({
        tenantId,
        orderId: data.orderId,
        cashierId: data.cashierId || null,
        amount,
        method: data.method,
        reference: data.reference ? String(data.reference).trim() : null,
        installments,
        interestPercent,
        interestAmount,
        cardSaleId: data.cardSaleId ? String(data.cardSaleId).trim() : null,
        authorizationCode: data.authorizationCode ? String(data.authorizationCode).trim() : null,
        createdBy: actorId,
    }, { session });

    return payment;
};

// Lista pagamentos do tenant com paginação.
export const getPaymentsService = async (query, tenantId) => {
    const { page, limit, skip } = getPagination(query);
    const sort = getSort(query, "createdAt");

    const filter = { ...baseQuery(tenantId, false) };

    if (query.orderId) filter.orderId = query.orderId;
    if (query.cashierId) filter.cashierId = query.cashierId;
    if (query.method) filter.method = query.method;
    if (query.status) filter.status = query.status;

    const [data, total] = await Promise.all([
        getPaymentsRepo(filter, skip, limit, sort),
        countPaymentsRepo(filter),
    ]);

    return paginatedResponse(data, page, limit, total);
};

// Busca um pagamento pelo ID dentro do tenant.
export const getPaymentByIdService = (id, tenantId, { session } = {}) => {
    return getPaymentByIdRepo(id, tenantId, { session });
};

// Cancela todos os pagamentos ativos de um pedido. Deve ser chamado dentro de uma transação externa.
export const cancelPaymentsByOrderService = async (orderId, tenantId, actorId, { session } = {}) => {
    return cancelPaymentsByOrderRepo(orderId, tenantId, actorId, { session });
};
