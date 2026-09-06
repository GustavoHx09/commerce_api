import {
    createBillRepo,
    getBillsRepo,
    countBillsRepo,
    getBillByIdRepo,
    updateBillRepo,
    softDeleteBillRepo,
    restoreBillRepo,
} from "./billRepo.js";
import { baseQuery } from "../../shared/utils/repositoryHelpers.js";
import { validateRequired, throwValidationError } from "../../shared/utils/serviceHelpers.js";
import { isValidDate } from "../../shared/utils/fieldsValidations.js";
import { getPagination, getSort, paginatedResponse } from "../../shared/utils/paginationHelpers.js";
import { auditAction } from "../audit/auditHelpers.js";

const VALID_TYPES = ["pay", "receive"];
const VALID_STATUSES = ["pending", "paid", "cancelled"];

// Valida os campos obrigatórios e valores de uma conta.
const validateBill = (data) => {
    validateRequired(data.type, "tipo");
    validateRequired(data.description, "descricao");
    validateRequired(data.dueDate, "data de vencimento");

    if (!VALID_TYPES.includes(data.type)) {
        throwValidationError("Tipo deve ser pay (pagar) ou receive (receber)");
    }

    const amount = Number(data.amount);
    if (isNaN(amount) || amount <= 0) {
        throwValidationError("Valor deve ser um numero maior que zero");
    }

    if (!isValidDate(data.dueDate)) {
        throwValidationError("Data de vencimento invalida");
    }

    if (data.status && !VALID_STATUSES.includes(data.status)) {
        throwValidationError("Status invalido");
    }
};

// Cria uma nova conta a pagar ou receber.
export const createBillService = async (data, tenantId, actorId) => {
    validateBill(data);

    const bill = await createBillRepo({
        tenantId,
        type: data.type,
        description: data.description ? String(data.description).trim() : null,
        amount: Number(data.amount),
        dueDate: new Date(data.dueDate),
        status: data.status || "pending",
        paidAt: data.status === "paid" ? new Date() : null,
        contactId: data.contactId || null,
        contactType: data.contactType || null,
        notes: data.notes ? String(data.notes).trim() : null,
        createdBy: actorId,
    });

    await auditAction("bill", "create", null, bill, actorId);

    return bill;
};

// Lista contas do tenant com filtros e paginacao.
export const getBillsService = async (query, tenantId, includeDeleted = false) => {
    const { page, limit, skip } = getPagination(query);
    const sort = getSort(query, "dueDate");

    const filter = { ...baseQuery(tenantId, includeDeleted) };

    if (query.type) filter.type = query.type;
    if (query.status) filter.status = query.status;
    if (query.startDueDate && query.endDueDate) {
        filter.dueDate = {
            $gte: new Date(query.startDueDate),
            $lte: new Date(query.endDueDate),
        };
    }

    const [data, total] = await Promise.all([
        getBillsRepo(filter, skip, limit, sort),
        countBillsRepo(filter),
    ]);

    return paginatedResponse(data, page, limit, total);
};

// Busca uma conta pelo ID dentro do tenant.
export const getBillByIdService = (id, tenantId, includeDeleted = false) => {
    return getBillByIdRepo(id, tenantId, includeDeleted);
};

// Atualiza uma conta existente.
export const updateBillService = async (id, data, tenantId, actorId) => {
    const previous = await getBillByIdRepo(id, tenantId, false);

    if (!previous) {
        throwValidationError("Conta nao encontrada", 404);
    }

    if (previous.status === "cancelled") {
        throwValidationError("Nao e possivel alterar uma conta cancelada", 409);
    }

    const update = {};

    if (data.description !== undefined) update.description = String(data.description).trim();
    if (data.amount !== undefined) {
        const amount = Number(data.amount);
        if (isNaN(amount) || amount <= 0) {
            throwValidationError("Valor deve ser um numero maior que zero");
        }
        update.amount = amount;
    }
    if (data.dueDate !== undefined) {
        if (!isValidDate(data.dueDate)) {
            throwValidationError("Data de vencimento invalida");
        }
        update.dueDate = new Date(data.dueDate);
    }
    if (data.notes !== undefined) update.notes = data.notes ? String(data.notes).trim() : null;
    if (data.contactId !== undefined) update.contactId = data.contactId || null;
    if (data.contactType !== undefined) update.contactType = data.contactType || null;

    const bill = await updateBillRepo(id, update, tenantId);

    await auditAction("bill", "update", previous, bill, actorId);

    return bill;
};

// Marca uma conta como paga.
export const payBillService = async (id, tenantId, actorId) => {
    const previous = await getBillByIdRepo(id, tenantId, false);

    if (!previous) {
        throwValidationError("Conta nao encontrada", 404);
    }

    if (previous.status !== "pending") {
        throwValidationError("Apenas contas pendentes podem ser pagas/recebidas", 409);
    }

    const bill = await updateBillRepo(
        id,
        { status: "paid", paidAt: new Date() },
        tenantId
    );

    await auditAction("bill", "update", previous, bill, actorId);

    return bill;
};

// Cancela uma conta sem apagar o historico.
export const cancelBillService = async (id, tenantId, actorId) => {
    const previous = await getBillByIdRepo(id, tenantId, false);

    if (!previous) {
        throwValidationError("Conta nao encontrada", 404);
    }

    if (previous.status === "cancelled") {
        throwValidationError("Conta ja esta cancelada", 409);
    }

    const bill = await updateBillRepo(
        id,
        { status: "cancelled" },
        tenantId
    );

    await auditAction("bill", "update", previous, bill, actorId);

    return bill;
};

// Realiza soft delete de uma conta.
export const softDeleteBillService = async (id, tenantId, actorId) => {
    const previous = await getBillByIdRepo(id, tenantId, false);

    if (!previous) {
        throwValidationError("Conta nao encontrada", 404);
    }

    const bill = await softDeleteBillRepo(id, tenantId);

    await auditAction("bill", "delete", previous, bill, actorId);

    return bill;
};

// Restaura uma conta removida por soft delete.
export const restoreBillService = async (id, tenantId, actorId) => {
    const previous = await getBillByIdRepo(id, tenantId, true);

    if (!previous) {
        throwValidationError("Conta nao encontrada", 404);
    }

    if (!previous.deletedAt) {
        throwValidationError("Conta nao esta removida", 400);
    }

    const bill = await restoreBillRepo(id, tenantId);

    await auditAction("bill", "restore", previous, bill, actorId);

    return bill;
};
