import stockMovements from "./stockMovementModel.js";
import { baseQuery } from "../../shared/utils/repositoryHelpers.js";

// Cria uma nova movimentação de estoque.
export const createStockMovementRepo = async (data, { session } = {}) => {
    const [created] = await stockMovements.create([data], { session });
    return created;
};

// Retorna movimentações paginadas com base no filtro.
export const getStockMovementsRepo = (filter, skip, limit, sort) =>
    stockMovements.find(filter).skip(skip).limit(limit).sort(sort).populate("productId", "name sku");

// Conta movimentações que satisfazem o filtro.
export const countStockMovementsRepo = (filter) => stockMovements.countDocuments(filter);

// Busca uma movimentação pelo ID dentro do tenant.
export const getStockMovementByIdRepo = (id, tenantId) =>
    stockMovements.findOne({ _id: id, ...baseQuery(tenantId, false) }).populate("productId", "name sku");

// Conta movimentações de um produto específico (usado em hard delete).
export const countStockMovementsByProductRepo = (productId) => stockMovements.countDocuments({ productId });
