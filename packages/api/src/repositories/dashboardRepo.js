import users from "../models/usersModel.js";
import products from "../models/productsModel.js";

const tenantFilter = (tenantId) => tenantId ? { tenantId, deletedAt: null } : { deletedAt: null };

export const countUsers = (tenantId) => users.countDocuments(tenantFilter(tenantId));

export const countProducts = (tenantId) => products.countDocuments(tenantFilter(tenantId));
