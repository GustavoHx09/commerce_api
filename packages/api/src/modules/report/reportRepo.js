import orders from "../order/orderModel.js";
import products from "../product/productModel.js";
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

// Retorna resumo de vendas: agrupado ou total consolidado.
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

    const format = dateGroupFormat(groupBy);
    return orders.aggregate([
        { $match: match },
        {
            $group: {
                _id: { $dateToString: { format, date: "$createdAt", timezone: "UTC" } },
                count: { $sum: 1 },
                total: { $sum: "$total" },
            },
        },
        { $sort: { _id: 1 } },
        {
            $project: {
                _id: 0,
                period: "$_id",
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
