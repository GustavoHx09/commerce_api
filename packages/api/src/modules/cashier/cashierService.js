import {
    createCashierRepo,
    getCashiersRepo,
    countCashiersRepo,
    getCashierByIdRepo,
    getOpenCashierByUserRepo,
    getOpenCashierByTenantRepo,
    getLastClosedCashierRepo,
    updateCashierRepo,
    softDeleteCashierRepo,
    restoreCashierRepo,
    hardDeleteCashierRepo,
    createCashierMovementRepo,
    getCashierMovementsRepo,
    countCashierMovementsRepo,
    getCashierBalancesRepo,
} from "./cashierRepo.js";
import { countOrdersByCashierRepo } from "../order/orderRepo.js";
import { getCashierPaymentTotalsRepo } from "../payment/paymentRepo.js";
import { getTenantByIdRepo } from "../tenant/tenantRepo.js";
import { baseQuery } from "../../shared/utils/repositoryHelpers.js";
import { validateRequired, throwValidationError } from "../../shared/utils/serviceHelpers.js";
import { getPagination, getSort, paginatedResponse } from "../../shared/utils/paginationHelpers.js";
import { auditAction } from "../audit/auditHelpers.js";

// Tipos de movimentação que aumentam o dinheiro físico em caixa.
const INFLOW_TYPES = ["suprimento", "venda", "recebimento_conta"];

// Calcula o saldo atual do caixa somente pelas movimentações registradas,
// que são criadas em tempo real a cada venda, estorno, sangria, reforço e conta.
export const calculateCashierBalance = async (cashier, session) => {
    const movements = await getCashierMovementsRepo(
        { cashierId: cashier._id, tenantId: cashier.tenantId },
        0, 0, {}, { session }
    );

    return movements.reduce(
        (balance, m) => INFLOW_TYPES.includes(m.type) ? balance + m.amount : balance - m.amount,
        cashier.initialAmount
    );
};

// Registra uma movimentação de caixa gerada pelo sistema (venda, estorno,
// pagamento de conta). Usada pelos services de pedido e conta dentro da
// mesma transação para manter o extrato do caixa em tempo real.
export const createSystemCashierMovement = async (data, actorId, { session } = {}) => {
    return createCashierMovementRepo({
        cashierId: data.cashierId,
        tenantId: data.tenantId,
        type: data.type,
        amount: data.amount,
        reason: data.reason ? String(data.reason).trim() : null,
        orderId: data.orderId || null,
        billId: data.billId || null,
        createdBy: actorId,
    }, { session });
};

export const createCashierService = async (data, tenantId, actorId) => {
    // O tenant define o modo de operação: "shared" impõe um único caixa aberto
    // para toda a empresa; "per_operator" (padrão) impõe um caixa por usuário.
    const tenant = await getTenantByIdRepo(tenantId);
    const sharedMode = tenant?.cashierMode === "shared";

    const existing = sharedMode
        ? await getOpenCashierByTenantRepo(tenantId)
        : await getOpenCashierByUserRepo(tenantId, actorId);
    if (existing) {
        throwValidationError(
            sharedMode ? "Já existe um caixa aberto para esta empresa" : "Usuário já possui um caixa aberto",
            409
        );
    }

    // A partir do segundo caixa, o valor inicial é obrigatoriamente o saldo de
    // fechamento do caixa anterior. O valor enviado pelo cliente é ignorado,
    // garantindo a regra também contra alterações via ferramentas de dev.
    const lastClosed = await getLastClosedCashierRepo(tenantId);

    let initialAmount;
    if (lastClosed) {
        initialAmount = Number(lastClosed.finalAmount || 0);
    } else {
        validateRequired(data.initialAmount, "valor inicial");
        initialAmount = Number(data.initialAmount);
        if (isNaN(initialAmount) || initialAmount < 0) {
            throwValidationError("Valor inicial deve ser um número positivo ou zero");
        }
    }

    const cashier = await createCashierRepo({
        tenantId,
        openedBy: actorId,
        initialAmount,
        status: "open",
    });

    await auditAction("cashier", "create", null, cashier, actorId);

    return cashier;
};

export const getCashiersService = async (query, tenantId, includeDeleted = false) => {
    const { page, limit, skip } = getPagination(query);
    const sort = getSort(query, "openedAt");

    const filter = { ...baseQuery(tenantId, includeDeleted) };

    if (query.status) {
        filter.status = query.status;
    }

    const [data, total] = await Promise.all([
        getCashiersRepo(filter, skip, limit, sort),
        countCashiersRepo(filter),
    ]);

    // Anexa o saldo atual (inicial + movimentações) a cada caixa listado.
    const balances = await getCashierBalancesRepo(data.map((row) => row._id));
    const balanceById = new Map(balances.map((entry) => [entry._id.toString(), entry.balance]));

    const rows = data.map((row) => ({
        ...row.toObject(),
        balance: (row.initialAmount || 0) + (balanceById.get(row._id.toString()) || 0),
    }));

    return { ...paginatedResponse(rows, page, limit, total) };
};

// Retorna o caixa com o saldo atual calculado pelas movimentações em tempo real
// e os totais recebidos por forma de pagamento (dinheiro, pix e cartões).
export const getCashierByIdService = async (id, tenantId, includeDeleted = false) => {
    const cashier = await getCashierByIdRepo(id, tenantId, includeDeleted);

    if (!cashier) return cashier;

    const [balance, totals] = await Promise.all([
        calculateCashierBalance(cashier),
        getCashierPaymentTotalsRepo(cashier._id, tenantId),
    ]);

    const byMethod = new Map(totals.map((entry) => [entry._id, entry.total]));
    const paymentTotals = {
        cash: byMethod.get("cash") || 0,
        pix: byMethod.get("pix") || 0,
        // Cartões agrupam débito e crédito em um único total.
        cards: (byMethod.get("credit_card") || 0) + (byMethod.get("debit_card") || 0),
    };

    return { ...cashier.toObject(), balance, paymentTotals };
};

export const closeCashierService = async (id, tenantId, actorId) => {
    const previous = await getCashierByIdRepo(id, tenantId, false);

    if (!previous) {
        throwValidationError("Caixa não encontrado", 404);
    }

    if (previous.status !== "open") {
        throwValidationError("Caixa já está fechado", 409);
    }

    // Regra de negócio: somente o usuário que abriu o caixa pode fechá-lo,
    // em qualquer modo de operação (openedBy pode vir populado com o nome).
    const openerId = String(previous.openedBy?._id || previous.openedBy);
    if (openerId !== actorId) {
        throwValidationError("Somente o usuário que abriu o caixa pode fechá-lo", 403);
    }

    const finalAmount = await calculateCashierBalance(previous);

    const cashier = await updateCashierRepo(
        id,
        {
            status: "closed",
            closedAt: new Date(),
            closedBy: actorId,
            finalAmount,
        },
        tenantId
    );

    await auditAction("cashier", "update", previous, cashier, actorId);

    return cashier;
};

export const createCashierMovementService = async (cashierId, data, tenantId, actorId) => {
    validateRequired(data.type, "tipo");
    validateRequired(data.amount, "valor");

    if (!["suprimento", "sangria"].includes(data.type)) {
        throwValidationError("Tipo deve ser suprimento ou sangria");
    }

    const amount = Number(data.amount);
    if (isNaN(amount) || amount <= 0) {
        throwValidationError("Valor deve ser um número positivo");
    }

    const cashier = await getCashierByIdRepo(cashierId, tenantId, false);

    if (!cashier) {
        throwValidationError("Caixa não encontrado", 404);
    }

    if (cashier.status !== "open") {
        throwValidationError("Caixa está fechado", 409);
    }

    if (data.type === "sangria") {
        const balance = await calculateCashierBalance(cashier);
        if (amount > balance) {
            throwValidationError("Sangria maior que o saldo disponível no caixa", 409);
        }
    }

    const movement = await createCashierMovementRepo({
        cashierId,
        tenantId,
        type: data.type,
        amount,
        reason: data.reason ? String(data.reason).trim() : null,
        createdBy: actorId,
    });

    await auditAction("cashierMovement", "create", null, movement, actorId);

    return movement;
};

export const getCashierMovementsService = async (cashierId, query, tenantId) => {
    const { page, limit, skip } = getPagination(query);
    const sort = getSort(query, "createdAt");

    const filter = { cashierId, tenantId };

    if (query.type) {
        filter.type = query.type;
    }

    const [data, total] = await Promise.all([
        getCashierMovementsRepo(filter, skip, limit, sort),
        countCashierMovementsRepo(filter),
    ]);

    return paginatedResponse(data, page, limit, total);
};

export const softDeleteCashierService = async (id, tenantId, actorId) => {
    const previous = await getCashierByIdRepo(id, tenantId, false);

    if (!previous) {
        throwValidationError("Caixa não encontrado", 404);
    }

    const cashier = await softDeleteCashierRepo(id, tenantId);

    await auditAction("cashier", "delete", previous, cashier, actorId);

    return cashier;
};

export const hardDeleteCashierService = async (id, actor) => {
    if (actor.role !== "master") {
        throwValidationError("Apenas master pode fazer hard delete", 403);
    }

    const cashier = await getCashierByIdRepo(id, null, true);

    if (!cashier) {
        throwValidationError("Caixa não encontrado", 404);
    }

    const [movementsCount, ordersCount] = await Promise.all([
        countCashierMovementsRepo({ cashierId: id }),
        countOrdersByCashierRepo(id),
    ]);

    if (movementsCount > 0 || ordersCount > 0) {
        throwValidationError("Não é possível excluir permanentemente um caixa com movimentações ou vendas vinculadas", 409);
    }

    await auditAction("cashier", "delete", cashier, null, actor.id);

    return await hardDeleteCashierRepo(id);
};

export const restoreCashierService = async (id, tenantId, actorId) => {
    const previous = await getCashierByIdRepo(id, tenantId, true);

    if (!previous) {
        throwValidationError("Caixa não encontrado", 404);
    }

    if (!previous.deletedAt) {
        throwValidationError("Caixa não está removido", 400);
    }

    const cashier = await restoreCashierRepo(id, tenantId);

    await auditAction("cashier", "restore", previous, cashier, actorId);

    return cashier;
};
