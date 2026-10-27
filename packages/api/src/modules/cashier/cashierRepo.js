import cashiers from "./cashierModel.js";
import cashierMovements from "./cashierMovementModel.js";
import { baseQuery } from "../../shared/utils/repositoryHelpers.js";

export const createCashierRepo = async (data, { session } = {}) => {
    const [created] = await cashiers.create([data], { session });
    return created;
};

export const getCashiersRepo = (filter, skip, limit, sort) =>
    cashiers.find(filter).skip(skip).limit(limit).sort(sort).populate("openedBy", "name").populate("closedBy", "name");

export const countCashiersRepo = (filter) => cashiers.countDocuments(filter);

export const getCashierByIdRepo = (id, tenantId, includeDeleted = false, { session } = {}) =>
    cashiers
        .findOne({ _id: id, ...baseQuery(tenantId, includeDeleted) })
        .session(session)
        .populate("openedBy", "name")
        .populate("closedBy", "name");

export const getOpenCashierByUserRepo = (tenantId, userId, { session } = {}) =>
    cashiers.findOne({ tenantId, openedBy: userId, status: "open", deletedAt: null }).session(session);

// Retorna qualquer caixa aberto do tenant, usado no modo de caixa compartilhado
// (cashierMode = "shared"), onde a empresa opera uma única gaveta.
export const getOpenCashierByTenantRepo = (tenantId, { session } = {}) =>
    cashiers.findOne({ tenantId, status: "open", deletedAt: null }).session(session);

export const updateCashierRepo = (id, data, tenantId, { session } = {}) =>
    cashiers.findOneAndUpdate({ _id: id, ...baseQuery(tenantId, true) }, data, { new: true, session });

export const softDeleteCashierRepo = (id, tenantId, { session } = {}) =>
    cashiers.findOneAndUpdate({ _id: id, ...baseQuery(tenantId, false) }, { deletedAt: new Date() }, { new: true, session });

export const restoreCashierRepo = (id, tenantId, { session } = {}) =>
    cashiers.findOneAndUpdate({ _id: id, ...baseQuery(tenantId, true) }, { deletedAt: null }, { new: true, session });

export const hardDeleteCashierRepo = (id, { session } = {}) =>
    cashiers.findByIdAndDelete(id, { session });

export const createCashierMovementRepo = async (data, { session } = {}) => {
    const [created] = await cashierMovements.create([data], { session });
    return created;
};

export const getCashierMovementsRepo = (filter, skip, limit, sort, { session } = {}) =>
    cashierMovements
        .find(filter)
        .skip(skip)
        .limit(limit)
        .sort(sort)
        .session(session)
        .populate("createdBy", "name")
        // Traz o total da venda vinculada para exibir nas movimentações,
        // já que o amount da movimentação é só a parte em dinheiro.
        .populate("orderId", "orderNumber total amountPaid");

export const countCashierMovementsRepo = (filter) => cashierMovements.countDocuments(filter);

// Soma assinada das movimentações agrupadas por caixa, usada para exibir o
// saldo atual de cada caixa na listagem sem consulta por registro.
export const getCashierBalancesRepo = (cashierIds) =>
    cashierMovements.aggregate([
        { $match: { cashierId: { $in: cashierIds } } },
        {
            $group: {
                _id: "$cashierId",
                balance: {
                    $sum: {
                        $cond: [
                            { $in: ["$type", ["suprimento", "venda", "recebimento_conta"]] },
                            "$amount",
                            { $multiply: ["$amount", -1] },
                        ],
                    },
                },
            },
        },
    ]);

// Retorna o caixa fechado mais recente do tenant, usado para herdar o saldo
// de fechamento como valor inicial da próxima abertura.
export const getLastClosedCashierRepo = (tenantId, { session } = {}) =>
    cashiers.findOne({ tenantId, status: "closed", deletedAt: null }).sort({ closedAt: -1 }).session(session);
