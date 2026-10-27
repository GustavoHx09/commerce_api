import orders from "../order/orderModel.js";
import products from "../product/productModel.js";
import bills from "../bill/billModel.js";
import cashierMovements from "../cashier/cashierMovementModel.js";
import { getStockMovementsRepo, countStockMovementsRepo } from "../stock/stockMovementRepo.js";
import { baseQuery } from "../../shared/utils/repositoryHelpers.js";

// Status considerados como venda efetiva para relatórios.
const VALID_ORDER_STATUSES = ["paid", "delivered"];

// Monta o filtro base de pedidos pagos/entregues dentro do período e tenant.
const orderBaseMatch = (tenantId, startDate, endDate) => ({
    ...baseQuery(tenantId, false),
    status: { $in: VALID_ORDER_STATUSES },
    createdAt: { $gte: startDate, $lte: endDate },
});

// Mapeia o agrupamento para o formato de data do MongoDB.
const dateGroupFormat = (groupBy) => {
    if (groupBy === "day") return "%Y-%m-%d";
    if (groupBy === "month") return "%Y-%m";
    if (groupBy === "year") return "%Y";
    return null;
};

// Status incluídos no relatório de vendas por período (finalizadas e canceladas).
const REPORT_ORDER_STATUSES = ["paid", "delivered", "canceled"];

// Retorna resumo de vendas: agrupado por período e situação, ou total consolidado.
export const getSalesSummary = async (tenantId, startDate, endDate, groupBy) => {
    const match = orderBaseMatch(tenantId, startDate, endDate);

    if (groupBy === "none") {
        const [count, totalAgg] = await Promise.all([
            orders.countDocuments(match),
            orders.aggregate([
                { $match: match },
                { $group: { _id: null, total: { $sum: "$total" } } },
            ]),
        ]);

        return { count, total: totalAgg[0]?.total || 0 };
    }

    // No detalhamento por período, vendas canceladas também aparecem.
    const reportMatch = { ...match, status: { $in: REPORT_ORDER_STATUSES } };

    const format = dateGroupFormat(groupBy);
    return orders.aggregate([
        { $match: reportMatch },
        {
            $group: {
                _id: {
                    period: { $dateToString: { format, date: "$createdAt", timezone: "UTC" } },
                    status: "$status",
                },
                count: { $sum: 1 },
                total: { $sum: "$total" },
            },
        },
        { $sort: { "_id.period": 1, "_id.status": 1 } },
        {
            $project: {
                _id: 0,
                period: "$_id.period",
                status: "$_id.status",
                count: 1,
                total: 1,
            },
        },
    ]);
};

// Retorna os produtos mais vendidos (quantidade e receita) no período.
export const getTopProducts = (tenantId, startDate, endDate, limit) => {
    const match = orderBaseMatch(tenantId, startDate, endDate);

    return orders.aggregate([
        { $match: match },
        { $unwind: "$items" },
        {
            $group: {
                _id: { productId: "$items.productId", sku: "$items.sku", name: "$items.name" },
                quantity: { $sum: "$items.quantity" },
                revenue: { $sum: "$items.total" },
            },
        },
        { $sort: { quantity: -1, revenue: -1 } },
        { $limit: limit },
        {
            $project: {
                _id: 0,
                productId: "$_id.productId",
                sku: "$_id.sku",
                name: "$_id.name",
                quantity: 1,
                revenue: 1,
            },
        },
    ]);
};

// Retorna lista paginada de produtos para o relatório de estoque.
export const getInventoryReport = (filter, skip, limit, sort) => {
    return products
        .find(filter)
        .select("name sku unit quantityInStock minStock price costPrice categoryId")
        .populate("categoryId", "name")
        .sort(sort)
        .skip(skip)
        .limit(limit);
};

// Retorna os totais do estoque: quantidade de produtos, valor de custo, venda e abaixo do mínimo.
export const getInventorySummary = async (tenantId, lowStockOnly) => {
    const match = { ...baseQuery(tenantId, false) };
    if (lowStockOnly) match.$expr = { $lte: ["$quantityInStock", "$minStock"] };

    const [result] = await products.aggregate([
        { $match: match },
        {
            $group: {
                _id: null,
                totalProducts: { $sum: 1 },
                lowStockCount: { $sum: { $cond: [{ $lte: ["$quantityInStock", "$minStock"] }, 1, 0] } },
                totalCostValue: {
                    $sum: { $multiply: [{ $ifNull: ["$costPrice", 0] }, "$quantityInStock"] },
                },
                totalSaleValue: {
                    $sum: { $multiply: ["$price", "$quantityInStock"] },
                },
            },
        },
    ]);

    return result || { totalProducts: 0, lowStockCount: 0, totalCostValue: 0, totalSaleValue: 0 };
};

// Retorna as movimentações de estoque com base no filtro.
export const getStockMovementsReport = (filter, skip, limit, sort) => {
    return getStockMovementsRepo(filter, skip, limit, sort);
};

// Conta o total de movimentações que atendem ao filtro.
export const countStockMovements = (filter) => {
    return countStockMovementsRepo(filter);
};

// Fluxo de caixa: total de vendas realizadas no período.
export const getCashFlowSales = (tenantId, startDate, endDate, groupBy) => {
    const match = { ...baseQuery(tenantId, false), status: { $in: VALID_ORDER_STATUSES }, createdAt: { $gte: startDate, $lte: endDate } };

    if (groupBy === "none") {
        return orders.aggregate([
            { $match: match },
            { $group: { _id: null, total: { $sum: "$total" } } },
            { $project: { _id: 0, total: 1 } },
        ]).then((result) => result[0] || { total: 0 });
    }

    const format = dateGroupFormat(groupBy);
    return orders.aggregate([
        { $match: match },
        {
            $group: {
                _id: { $dateToString: { format, date: "$createdAt", timezone: "UTC" } },
                total: { $sum: "$total" },
            },
        },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, period: "$_id", total: 1 } },
    ]);
};

// Fluxo de caixa: contas pagas e recebidas no período.
export const getCashFlowBills = (tenantId, startDate, endDate, groupBy) => {
    const match = { ...baseQuery(tenantId, false), status: "paid", paidAt: { $gte: startDate, $lte: endDate } };

    const groupTotals = {
        receive: { $sum: { $cond: [{ $eq: ["$type", "receive"] }, "$amount", 0] } },
        pay: { $sum: { $cond: [{ $eq: ["$type", "pay"] }, "$amount", 0] } },
    };

    if (groupBy === "none") {
        return bills.aggregate([
            { $match: match },
            { $group: { _id: null, ...groupTotals } },
            { $project: { _id: 0, receive: 1, pay: 1 } },
        ]).then((result) => result[0] || { receive: 0, pay: 0 });
    }

    const format = dateGroupFormat(groupBy);
    return bills.aggregate([
        { $match: match },
        {
            $group: {
                _id: { $dateToString: { format, date: "$paidAt", timezone: "UTC" } },
                ...groupTotals,
            },
        },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, period: "$_id", receive: 1, pay: 1 } },
    ]);
};

// Fluxo de caixa: todas as movimentações do caixa físico do período, por tipo.
// "cashSales" = dinheiro das vendas; "estornos" = saída por venda cancelada;
// "billsPayCashier"/"billsReceiveCashier" = contas liquidadas via caixa.
export const getCashFlowMovements = (tenantId, startDate, endDate, groupBy) => {
    // Usa o cast de baseQuery: aggregation não converte string em ObjectId.
    const match = { ...baseQuery(tenantId, true), createdAt: { $gte: startDate, $lte: endDate } };
    delete match.deletedAt;

    const typeSum = (type) => ({ $sum: { $cond: [{ $eq: ["$type", type] }, "$amount", 0] } });
    const groupTotals = {
        suprimentos: typeSum("suprimento"),
        sangrias: typeSum("sangria"),
        cashSales: typeSum("venda"),
        estornos: typeSum("estorno"),
        billsPayCashier: typeSum("pagamento_conta"),
        billsReceiveCashier: typeSum("recebimento_conta"),
    };

    const zeros = { suprimentos: 0, sangrias: 0, cashSales: 0, estornos: 0, billsPayCashier: 0, billsReceiveCashier: 0 };

    if (groupBy === "none") {
        return cashierMovements.aggregate([
            { $match: match },
            { $group: { _id: null, ...groupTotals } },
            { $project: { _id: 0, ...Object.fromEntries(Object.keys(zeros).map((key) => [key, 1])) } },
        ]).then((result) => result[0] || zeros);
    }

    const format = dateGroupFormat(groupBy);
    return cashierMovements.aggregate([
        { $match: match },
        {
            $group: {
                _id: { $dateToString: { format, date: "$createdAt", timezone: "UTC" } },
                ...groupTotals,
            },
        },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, period: "$_id", ...Object.fromEntries(Object.keys(zeros).map((key) => [key, 1])) } },
    ]);
};
