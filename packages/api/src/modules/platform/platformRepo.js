// Acesso cross-tenant para o painel da plataforma — exclusivo do master,
// por isso não recebe tenantId: agrega dados de todas as empresas.
import tenantModel from "../tenant/tenantModel.js";
import userModel from "../user/userModel.js";
import productModel from "../product/productModel.js";
import orderModel from "../order/orderModel.js";

// Empresas cadastradas (ativas e inativas) para montar a tabela do painel.
export const getTenantsRepo = () =>
    tenantModel.find({ deletedAt: null }).select("name displayName isActive createdAt").sort({ name: 1 }).lean();

// Contadores por tenant em uma única agregação por coleção — evita N+1.
const countByTenant = (model, match = {}) =>
    model.aggregate([
        { $match: { deletedAt: null, ...match } },
        { $group: { _id: "$tenantId", total: { $sum: 1 } } },
    ]);

export const countUsersByTenantRepo = () => countByTenant(userModel);
export const countProductsByTenantRepo = () => countByTenant(productModel, { isActive: true });

// Vendas pagas por tenant: quantidade, faturamento e data da última venda.
export const getSalesByTenantRepo = () =>
    orderModel.aggregate([
        { $match: { deletedAt: null, status: "paid" } },
        {
            $group: {
                _id: "$tenantId",
                orders: { $sum: 1 },
                revenue: { $sum: "$total" },
                lastOrderAt: { $max: "$createdAt" },
            },
        },
    ]);
