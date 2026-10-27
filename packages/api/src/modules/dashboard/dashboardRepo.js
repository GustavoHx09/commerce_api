import users from "../user/userModel.js";
import products from "../product/productModel.js";
import customers from "../customer/customerModel.js";
import orders from "../order/orderModel.js";
import cashiers from "../cashier/cashierModel.js";
import cashierMovements from "../cashier/cashierMovementModel.js";
import { baseQuery } from "../../shared/utils/repositoryHelpers.js";

// Monta o filtro por tenant, ignorando registros soft deleted.
// Reaproveita baseQuery que converte o tenantId para ObjectId: aggregations do
// MongoDB não fazem cast de string automaticamente como o Mongoose faz.
const tenantFilter = (tenantId, extra = {}) => ({ ...baseQuery(tenantId, false), ...extra });

// Conta o total de usuários ativos do tenant.
export const countUsers = (tenantId) => users.countDocuments(tenantFilter(tenantId));

// Conta o total de produtos ativos do tenant.
export const countProducts = (tenantId) => products.countDocuments(tenantFilter(tenantId));

// Conta o total de clientes ativos do tenant.
export const countCustomers = (tenantId) => customers.countDocuments(tenantFilter(tenantId));

// Retorna quantidade e valor total de vendas no período informado.
export const getSalesSummary = async (tenantId, startDate, endDate) => {
    const match = {
        ...tenantFilter(tenantId, { status: { $in: ["paid", "delivered"] } }),
        createdAt: { $gte: startDate, $lte: endDate },
    };

    const [count, totalAgg] = await Promise.all([
        orders.countDocuments(match),
        orders.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: "$total" } } }]),
    ]);

    return { count, total: totalAgg[0]?.total || 0 };
};

// Retorna quantidade e valor total de vendas canceladas/estornadas no período.
export const getCanceledSalesSummary = async (tenantId, startDate, endDate) => {
    const match = {
        ...tenantFilter(tenantId, { status: "canceled" }),
        createdAt: { $gte: startDate, $lte: endDate },
    };

    const [count, totalAgg] = await Promise.all([
        orders.countDocuments(match),
        orders.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: "$total" } } }]),
    ]);

    return { count, total: totalAgg[0]?.total || 0 };
};

// Retorna os produtos com estoque igual ou abaixo do mínimo.
export const getLowStockProducts = (tenantId, limit = 5) => {
    return products
        .find({
            ...tenantFilter(tenantId, { isActive: true }),
            $expr: { $lte: ["$quantityInStock", "$minStock"] },
        })
        .select("name sku quantityInStock minStock")
        .sort({ quantityInStock: 1 })
        .limit(limit);
};

// Retorna os caixas abertos do tenant.
export const getOpenCashiers = (tenantId) =>
    cashiers.find({ tenantId, status: "open", deletedAt: null });

// Retorna o total de movimentações (suprimento/sangria) para uma lista de caixas.
export const getCashierMovementsSummary = (cashierIds) => {
    if (!cashierIds.length) return Promise.resolve([]);

    return cashierMovements.aggregate([
        { $match: { cashierId: { $in: cashierIds } } },
        { $group: { _id: "$type", total: { $sum: "$amount" } } },
    ]);
};

// Retorna o valor total de vendas pagas para uma lista de caixas.
export const getOrdersTotalByCashiers = (cashierIds, tenantId) => {
    if (!cashierIds.length) return Promise.resolve(0);

    return orders
        .aggregate([
            {
                $match: {
                    cashierId: { $in: cashierIds },
                    ...baseQuery(tenantId, false),
                    status: { $in: ["paid", "delivered"] },
                },
            },
            { $group: { _id: null, total: { $sum: "$total" } } },
        ])
        .then((result) => result[0]?.total || 0);
};
