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
import { withTransaction } from "../../shared/utils/transactionHelpers.js";
import { getCashierByIdRepo } from "../cashier/cashierRepo.js";
import { calculateCashierBalance, createSystemCashierMovement } from "../cashier/cashierService.js";

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

    // Vencimento não pode ser no passado — compara só a data, sem hora.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(data.dueDate) < today) {
        throwValidationError("Data de vencimento deve ser hoje ou uma data futura");
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
        // Sem contactType explícito, infere pelo tipo da conta: pagar →
        // fornecedor, receber → cliente.
        contactType: data.contactType ||
            (data.contactId ? (data.type === "pay" ? "suppliers" : "customers") : null),
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

    if (previous.status !== "pending") {
        throwValidationError("Apenas contas pendentes podem ser alteradas", 409);
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
        // Mesma regra da criação: vencimento não pode ser no passado.
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (new Date(data.dueDate) < today) {
            throwValidationError("Data de vencimento deve ser hoje ou uma data futura");
        }
        update.dueDate = new Date(data.dueDate);
    }
    if (data.notes !== undefined) update.notes = data.notes ? String(data.notes).trim() : null;
    if (data.contactId !== undefined) {
        update.contactId = data.contactId || null;
        // Regrava o tipo do contato junto: sem contactId ele vira nulo; com
        // contactId e sem contactType explícito, infere pelo tipo da conta.
        update.contactType = data.contactType ||
            (data.contactId ? (previous.type === "pay" ? "suppliers" : "customers") : null);
    }
    if (data.contactType !== undefined) update.contactType = data.contactType || null;

    const bill = await updateBillRepo(id, update, tenantId);

    await auditAction("bill", "update", previous, bill, actorId);

    return bill;
};

const VALID_EXTERNAL_METHODS = ["cash", "pix", "credit_card", "debit_card", "other"];

// Marca uma conta como paga/recebida.
// Aceita liquidação combinada: parte sai do caixa aberto informado (cashierId +
// cashierAmount) e o restante é pago por fora (externalAmount + externalMethod,
// usado apenas como identificador para auditoria). Sem cashierId, a conta é
// liquidada totalmente por fora e o caixa não é movimentado.
export const payBillService = async (id, data = {}, tenantId, actorId) => {
    return withTransaction(async (session) => {
        const previous = await getBillByIdRepo(id, tenantId, false);

        if (!previous) {
            throwValidationError("Conta nao encontrada", 404);
        }

        if (previous.status !== "pending") {
            throwValidationError("Apenas contas pendentes podem ser pagas/recebidas", 409);
        }

        const total = Number(previous.amount);
        let cashierAmount = 0;
        let externalAmount;
        let externalMethod = null;
        let cashier = null;

        if (data.cashierId) {
            cashier = await getCashierByIdRepo(data.cashierId, tenantId, false, { session });

            if (!cashier) {
                throwValidationError("Caixa nao encontrado", 404);
            }
            if (cashier.status !== "open") {
                throwValidationError("O caixa informado esta fechado", 409);
            }

            externalAmount = Number(data.externalAmount || 0);
            if (isNaN(externalAmount) || externalAmount < 0 || externalAmount >= total) {
                throwValidationError("O valor externo deve ser maior ou igual a zero e menor que o total da conta");
            }

            cashierAmount = total - externalAmount;

            if (externalAmount > 0) {
                if (!VALID_EXTERNAL_METHODS.includes(data.externalMethod)) {
                    throwValidationError("Informe o identificador do pagamento externo");
                }
                externalMethod = data.externalMethod;
            }

            // Regra de segurança do caixa: o valor retirado nunca pode exceder o saldo atual.
            const balance = await calculateCashierBalance(cashier, session);
            if (cashierAmount > balance) {
                throwValidationError("Saldo do caixa insuficiente para esta operacao", 409);
            }

            // Contas a pagar retiram dinheiro; contas a receber colocam dinheiro.
            await createSystemCashierMovement({
                cashierId: cashier._id,
                tenantId,
                type: previous.type === "pay" ? "pagamento_conta" : "recebimento_conta",
                amount: cashierAmount,
                reason: `${previous.type === "pay" ? "Pagamento" : "Recebimento"} da conta: ${previous.description}`,
                billId: previous._id,
            }, actorId, { session });
        } else {
            externalAmount = total;
            if (data.externalMethod && VALID_EXTERNAL_METHODS.includes(data.externalMethod)) {
                externalMethod = data.externalMethod;
            }
        }

        const bill = await updateBillRepo(
            id,
            {
                status: "paid",
                paidAt: new Date(),
                cashierId: cashier?._id || null,
                cashierAmount,
                externalAmount,
                externalMethod,
            },
            tenantId,
            { session }
        );

        await auditAction("bill", "update", previous, bill, actorId, { session });

        return bill;
    });
};

// Estorna a liquidação de uma conta: devolve o valor ao caixa de origem
// (quando a baixa movimentou caixa) e volta a conta para pendente, limpando
// os dados da liquidação. Só permitido com o caixa de origem ainda aberto —
// caixa fechado é histórico consolidado e não deve ser alterado.
export const reverseBillService = async (id, tenantId, actorId, actorRole) => {
    return withTransaction(async (session) => {
        const previous = await getBillByIdRepo(id, tenantId, false);

        if (!previous) {
            throwValidationError("Conta nao encontrada", 404);
        }

        if (previous.status !== "paid") {
            throwValidationError("Apenas contas liquidadas podem ser estornadas", 409);
        }

        // Regra de prazo igual ao cancelamento de venda: funcionários só
        // estornam até 30 minutos após a baixa; admin/master sem limite.
        const isPrivileged = ["admin", "master"].includes(actorRole);
        const REVERSE_WINDOW_MS = 30 * 60 * 1000;
        if (!isPrivileged && Date.now() - new Date(previous.paidAt).getTime() > REVERSE_WINDOW_MS) {
            throwValidationError("O prazo de 30 minutos para estornar esta conta expirou — solicite a um administrador", 409);
        }

        const cashierAmount = Number(previous.cashierAmount || 0);
        if (previous.cashierId && cashierAmount > 0) {
            const cashier = await getCashierByIdRepo(previous.cashierId, tenantId, false, { session });

            if (!cashier) {
                throwValidationError("Caixa de origem nao encontrado", 404);
            }
            if (cashier.status !== "open") {
                throwValidationError("O caixa de origem ja esta fechado; nao e possivel estornar", 409);
            }

            // O estorno usa o tipo oposto da baixa: conta paga devolve dinheiro
            // ao caixa (recebimento) e conta recebida retira (pagamento),
            // mantendo o cálculo de saldo correto sem tipos novos.
            await createSystemCashierMovement({
                cashierId: cashier._id,
                tenantId,
                type: previous.type === "pay" ? "recebimento_conta" : "pagamento_conta",
                amount: cashierAmount,
                reason: `Estorno da conta: ${previous.description}`,
                billId: previous._id,
            }, actorId, { session });
        }

        const bill = await updateBillRepo(
            id,
            {
                status: "pending",
                paidAt: null,
                cashierId: null,
                cashierAmount: 0,
                externalAmount: 0,
                externalMethod: null,
            },
            tenantId,
            { session }
        );

        await auditAction("bill", "update", previous, bill, actorId, { session });

        return bill;
    });
};

// Cancela uma conta sem apagar o historico. Apenas contas pendentes podem
// ser canceladas — conta liquidada exige estorno antes.
export const cancelBillService = async (id, tenantId, actorId) => {
    const previous = await getBillByIdRepo(id, tenantId, false);

    if (!previous) {
        throwValidationError("Conta nao encontrada", 404);
    }

    if (previous.status !== "pending") {
        throwValidationError("Apenas contas pendentes podem ser canceladas", 409);
    }

    const bill = await updateBillRepo(
        id,
        { status: "cancelled" },
        tenantId
    );

    await auditAction("bill", "update", previous, bill, actorId);

    return bill;
};

// Realiza soft delete de uma conta. Apenas contas pendentes podem ser
// removidas — conta liquidada é escrituração financeira e fica preservada.
export const softDeleteBillService = async (id, tenantId, actorId) => {
    const previous = await getBillByIdRepo(id, tenantId, false);

    if (!previous) {
        throwValidationError("Conta nao encontrada", 404);
    }

    if (previous.status !== "pending") {
        throwValidationError("Apenas contas pendentes podem ser removidas", 409);
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
