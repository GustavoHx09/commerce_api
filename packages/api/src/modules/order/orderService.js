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
import { getCustomerByIdRepo, getCustomersRepo } from "../customer/customerRepo.js";
import { getUsersRepo } from "../user/userRepo.js";
import { getCashierByIdRepo } from "../cashier/cashierRepo.js";
import { createPaymentService, cancelPaymentsByOrderService } from "../payment/paymentService.js";
import { incrementOrderCounterRepo, getTenantByIdRepo } from "../tenant/tenantRepo.js";
import { createSystemCashierMovement, calculateCashierBalance } from "../cashier/cashierService.js";
import { baseQuery } from "../../shared/utils/repositoryHelpers.js";
import { isEmpty } from "../../shared/utils/fieldsValidations.js";
import { throwValidationError, accentInsensitiveRegex } from "../../shared/utils/serviceHelpers.js";
import { getPagination, getSort, paginatedResponse } from "../../shared/utils/paginationHelpers.js";
import { auditAction, toPlain } from "../audit/auditHelpers.js";

// Gera um ObjectId para ser usado como _id do pedido antes de criar o pagamento.
const generateOrderId = () => new mongoose.Types.ObjectId();

// A quantidade vendida deve ser sempre um número inteiro.
const validateQuantityByUnit = (quantity) => {
    if (!Number.isInteger(quantity)) {
        throwValidationError("Quantidade deve ser um número inteiro");
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

    // No modo de caixa compartilhado qualquer operador autorizado vende no caixa
    // aberto da empresa; no modo por operador o caixa precisa ser do próprio usuário.
    const tenant = await getTenantByIdRepo(tenantId);
    // openedBy pode vir populado ({ _id, name }) a partir do populate do repo.
    const openerId = String(cashier.openedBy?._id || cashier.openedBy);
    if (tenant?.cashierMode !== "shared" && openerId !== actorId) {
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
const processOrderItems = async (items, tenantId, orderId, orderNumber, actorId, session) => {
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

        validateQuantityByUnit(quantity);

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
            reference: `Venda #${orderNumber}`,
            createdBy: actorId,
        }, { session });

        // A baixa de estoque também altera a entidade produto — registra a
        // auditoria dela para a consulta de auditoria mostrar de onde veio
        // a mudança de saldo (venda vinculada via movimentação de estoque).
        await auditAction(
            "product",
            "update",
            { ...toPlain(product), quantityInStock: previousQuantity },
            product,
            actorId,
            { session }
        );
    }

    return processedItems;
};

const VALID_METHODS = ["cash", "pix", "credit_card", "debit_card", "other"];
const round2 = (value) => Math.round(value * 100) / 100;

// Valida e cria os pagamentos do pedido (suporta pagamento combinado).
// Cada pagamento informa o valor cobrado naquele método; para crédito, o juros
// configurado no tenant é embutido no valor e registrado para conferência.
const processPayments = async (paymentsInput, orderId, orderNumber, cashierId, tenant, actorId, total, session) => {
    if (!Array.isArray(paymentsInput) || paymentsInput.length === 0) {
        throwValidationError("Informe ao menos uma forma de pagamento");
    }

    const interestTable = new Map(
        (tenant.paymentFees?.creditInstallments || []).map((entry) => [
            Number(entry.installments),
            Number(entry.interestPercent),
        ])
    );

    let nonCashBase = 0; // parte de cada pagamento não-dinheiro que cobre o total (sem juros)
    let cashGiven = 0;
    const prepared = [];

    for (const payment of paymentsInput) {
        if (!payment || !VALID_METHODS.includes(payment.method)) {
            throwValidationError("Forma de pagamento inválida");
        }

        const amount = Number(payment.amount);
        if (isNaN(amount) || amount <= 0) {
            throwValidationError("Cada pagamento deve ter um valor maior que zero");
        }

        let installments = null;
        let interestPercent = 0;
        let base;
        let interestAmount = 0;

        if (payment.method === "credit_card") {
            installments = Number(payment.installments);
            if (!Number.isInteger(installments) || installments < 1 || installments > 48) {
                throwValidationError("Parcelas do cartão de crédito devem ser inteiras entre 1 e 48");
            }
            interestPercent = interestTable.get(installments) ?? 0;
            base = round2(amount / (1 + interestPercent / 100));
            interestAmount = round2(amount - base);
            nonCashBase += base;
        } else if (payment.method === "cash") {
            cashGiven += amount;
        } else {
            nonCashBase += amount;
        }

        prepared.push({ payment, amount, installments, interestPercent, interestAmount });
    }

    const remaining = round2(total - nonCashBase);
    if (remaining < -0.01) {
        throwValidationError("Pagamentos não em dinheiro excedem o total da venda");
    }

    const requiredCash = Math.max(0, remaining);
    let change = 0;
    if (cashGiven > 0) {
        if (cashGiven < requiredCash - 0.01) {
            throwValidationError("Valor em dinheiro insuficiente para cobrir o restante da venda");
        }
        change = round2(cashGiven - requiredCash);
    } else if (requiredCash > 0.01) {
        throwValidationError("O total dos pagamentos não cobre o valor da venda");
    }

    const paymentIds = [];
    let amountPaid = 0;

    for (const { payment, amount, installments, interestPercent, interestAmount } of prepared) {
        const created = await createPaymentService({
            orderId,
            cashierId,
            amount,
            method: payment.method,
            reference: payment.reference ? String(payment.reference).trim() : null,
            installments,
            interestPercent,
            interestAmount,
            cardSaleId: payment.cardSaleId ? String(payment.cardSaleId).trim() : null,
            authorizationCode: payment.authorizationCode ? String(payment.authorizationCode).trim() : null,
        }, tenant._id, actorId, { session });

        paymentIds.push(created._id);
        amountPaid += amount;
    }

    // Toda venda gera movimentação no caixa para rastreio do dia: quando houve
    // dinheiro, amount é o valor físico que entrou (líquido do troco); em vendas
    // só com pix/cartão registramos com valor zero — não afeta o saldo, mas
    // mantém a venda visível nas movimentações (o total vem do pedido populado).
    const cashInDrawer = round2(cashGiven - change);
    await createSystemCashierMovement({
        cashierId,
        tenantId: tenant._id,
        type: "venda",
        amount: Math.max(0, cashInDrawer),
        reason: `Venda #${orderNumber}`,
        orderId,
    }, actorId, { session });

    return { amountPaid: round2(amountPaid), change, paymentIds };
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

        // Incrementa o contador do tenant de forma atômica dentro da transação,
        // gerando a numeração sequencial da venda (1, 2, 3...) por empresa.
        const tenant = await incrementOrderCounterRepo(tenantId, { session });
        if (!tenant) {
            throwValidationError("Empresa não encontrada", 404);
        }
        const orderNumber = tenant.orderCounter;

        const processedItems = await processOrderItems(data.items, tenantId, orderId, orderNumber, actorId, session);

        const subtotal = processedItems.reduce((sum, item) => sum + item.total, 0);
        const orderDiscount = Number(data.discount || 0);
        const total = subtotal - orderDiscount;

        if (orderDiscount < 0 || orderDiscount > subtotal) {
            throwValidationError("Desconto do pedido não pode ser maior que o subtotal");
        }

        if (total < 0) {
            throwValidationError("Total do pedido não pode ser negativo");
        }

        // Aceita a lista "payments" (pagamento combinado) ou o campo legado "payment".
        const paymentsInput = Array.isArray(data.payments)
            ? data.payments
            : data.payment ? [data.payment] : [];

        const { amountPaid, change, paymentIds } = await processPayments(
            paymentsInput,
            orderId,
            orderNumber,
            data.cashierId,
            tenant,
            actorId,
            total,
            session
        );

        const order = await createOrderRepo({
            _id: orderId,
            tenantId,
            customerId: data.customerId || null,
            cashierId: data.cashierId,
            orderNumber,
            items: processedItems,
            discount: orderDiscount,
            total,
            amountPaid,
            change,
            status: "paid",
            paymentIds,
            observations: data.observations ? String(data.observations).trim() : null,
            createdBy: actorId,
        }, { session });

        await auditAction("order", "create", null, order, actorId, { session });

        // Retorna o pedido com cliente/pagamentos populados para o cupom e o modal.
        return getOrderByIdRepo(orderId, tenantId, false, { session });
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

    // Filtro por operador: o front envia um texto e resolvemos os usuários
    // do tenant cujo nome corresponde, filtrando pelos IDs encontrados.
    if (query.operator) {
        const term = String(query.operator).trim();
        const matching = await getUsersRepo(
            { tenantId, name: { $regex: accentInsensitiveRegex(term), $options: "i" }, deletedAt: null },
            0, 200
        );
        filter.createdBy = { $in: matching.map((user) => user._id) };
    }

    if (query.search) {
        const term = query.search.trim();
        filter.$or = [
            { "items.name": { $regex: accentInsensitiveRegex(term), $options: "i" } },
            { "items.sku": { $regex: term, $options: "i" } },
        ];
        // Termo numérico também casa com o número sequencial da venda.
        if (/^\d+$/.test(term)) {
            filter.$or.push({ orderNumber: Number(term) });
        }
        // Também busca pelo nome do cliente registrado na venda.
        const matchingCustomers = await getCustomersRepo(
            { tenantId, name: { $regex: accentInsensitiveRegex(term), $options: "i" }, deletedAt: null },
            0, 200
        );
        if (matchingCustomers.length) {
            filter.$or.push({ customerId: { $in: matchingCustomers.map((c) => c._id) } });
        }
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
// Regra de prazo: funcionários (sem role admin/master) só cancelam até 30 minutos
// após a venda; admin/master pode cancelar qualquer venda paga, sem limite de tempo.
export const cancelOrderService = async (id, data, tenantId, actorId, actorRole) => {
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

        // A janela de 30 minutos só se aplica a quem não é admin/master.
        const isPrivileged = ["admin", "master"].includes(actorRole);
        const CANCEL_WINDOW_MS = 30 * 60 * 1000;
        if (!isPrivileged && Date.now() - new Date(previous.createdAt).getTime() > CANCEL_WINDOW_MS) {
            throwValidationError("O prazo de 30 minutos para cancelar esta venda expirou — solicite a um administrador", 409);
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
                    reference: `Venda #${previous.orderNumber || id}`,
                    createdBy: actorId,
                }, { session });

                // A devolução do estoque também altera a entidade produto —
                // registra a auditoria dela com o saldo anterior reconstruído.
                await auditAction(
                    "product",
                    "update",
                    { ...toPlain(product), quantityInStock: previousQuantity },
                    product,
                    actorId,
                    { session }
                );
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

        // Registra o cancelamento nas movimentações do caixa para rastreio.
        // O valor é o dinheiro físico que sai da gaveta (pagamentos em dinheiro
        // menos o troco); vendas sem dinheiro ficam registradas com valor zero.
        const cashPayments = (previous.paymentIds || []).filter(
            (payment) => payment && payment.method === "cash" && payment.status !== "canceled"
        );
        const cashInDrawer = Math.max(
            0,
            cashPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0) - Number(previous.change || 0)
        );

        // Regra de reembolso: o dinheiro devolvido ao cliente não pode exceder
        // o saldo físico atual do caixa de origem da venda.
        if (cashInDrawer > 0) {
            const cashier = await getCashierByIdRepo(
                previous.cashierId?._id || previous.cashierId,
                tenantId,
                true,
                { session }
            );

            if (cashier) {
                const balance = await calculateCashierBalance(cashier, session);
                if (cashInDrawer > balance) {
                    throwValidationError(
                        `O valor a ser devolvido em dinheiro (${cashInDrawer}) é maior que o saldo atual do caixa (${balance})`,
                        409
                    );
                }
            }
        }

        await createSystemCashierMovement({
            cashierId: previous.cashierId?._id || previous.cashierId,
            tenantId,
            type: "estorno",
            amount: cashInDrawer,
            reason: `Cancelamento da venda #${previous.orderNumber || previous._id}`,
            orderId: previous._id,
        }, actorId, { session });

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
