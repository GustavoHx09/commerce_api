import users from "../user/userModel.js";
import products from "../product/productModel.js";

// Monta o filtro por tenant, ignorando registros soft deleted.
const tenantFilter = (tenantId) => tenantId ? { tenantId, deletedAt: null } : { deletedAt: null };

// Conta o total de usuários ativos do tenant.
export const countUsers = (tenantId) => users.countDocuments(tenantFilter(tenantId));

// Conta o total de produtos ativos do tenant.
export const countProducts = (tenantId) => products.countDocuments(tenantFilter(tenantId));
