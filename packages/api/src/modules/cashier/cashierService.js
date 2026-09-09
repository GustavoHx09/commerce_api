import {
    createCashierRepo,
    getCashiersRepo,
    countCashiersRepo,
    getCashierByIdRepo,
    getOpenCashierByUserRepo,
    updateCashierRepo,
    softDeleteCashierRepo,
    restoreCashierRepo,
    hardDeleteCashierRepo,
    createCashierMovementRepo,
    getCashierMovementsRepo,
    countCashierMovementsRepo,
} from "./cashierRepo.js";
import { getPaidOrdersTotalByCashier, countOrdersByCashierRepo } from "../order/orderRepo.js";
import { baseQuery } from "../../shared/utils/repositoryHelpers.js";
import { validateRequired, throwValidationError } from "../../shared/utils/serviceHelpers.js";
import { getPagination, getSort, paginatedResponse } from "../../shared/utils/paginationHelpers.js";
import { auditAction } from "../audit/auditHelpers.js";

// Calcula o saldo atual do caixa considerando valor inicial, movimentações e vendas pagas.
const calculateCashierBalance = async (cashier, session) => {
    const movementsFilter = { cashierId: cashier._id, tenantId: cashier.tenantId };
    const [movements, paidOrdersTotal] = await Promise.all([
        getCashierMovementsRepo(movementsFilter, 0, 0, {}),
        getPaidOrdersTotalByCashier(cashier._id, cashier.tenantId, { session }),
    ]);

    const suprimentos = movements
        .filter((m) => m.type === "suprimento")
        .reduce((sum, m) => sum + m.amount, 0);
    const sangrias = movements
        .filter((m) => m.type === "sangria")
        .reduce((sum, m) => sum + m.amount, 0);

    return cashier.initialAmount + suprimentos - sangrias + paidOrdersTotal;
};

export const createCashierService = async (data, tenantId, actorId) => {
    validateRequired(data.initialAmount, "valor inicial");

    const initialAmount = Number(data.initialAmount);
    if (isNaN(initialAmount) || initialAmount < 0) {
        throwValidationError("Valor inicial deve ser um número positivo ou zero");
    }

    const existing = await getOpenCashierByUserRepo(tenantId, actorId);
    if (existing) {
        throwValidationError("Usuário já possui um caixa aberto", 409);
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

    return paginatedResponse(data, page, limit, total);
};

export const getCashierByIdService = (id, tenantId, includeDeleted = false) => {
    return getCashierByIdRepo(id, tenantId, includeDeleted);
};

export const closeCashierService = async (id, tenantId, actorId) => {
    const previous = await getCashierByIdRepo(id, tenantId, false);

    if (!previous) {
        throwValidationError("Caixa não encontrado", 404);
    }

    if (previous.status !== "open") {
        throwValidationError("Caixa já está fechado", 409);
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
