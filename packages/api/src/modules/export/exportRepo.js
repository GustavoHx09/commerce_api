import { getProductsRepo, countProductsRepo } from "../product/productRepo.js";
import { getCategoriesRepo, countCategoriesRepo } from "../category/categoryRepo.js";
import { getCustomersRepo, countCustomersRepo } from "../customer/customerRepo.js";
import { getSuppliersRepo, countSuppliersRepo } from "../supplier/supplierRepo.js";
import { getOrdersRepo, countOrdersRepo } from "../order/orderRepo.js";
import { baseQuery } from "../../shared/utils/repositoryHelpers.js";

// Recursos exportáveis e as funções de consulta e contagem correspondentes.
const RESOURCE_HANDLERS = {
    categories: { get: getCategoriesRepo, count: countCategoriesRepo },
    products: { get: getProductsRepo, count: countProductsRepo },
    customers: { get: getCustomersRepo, count: countCustomersRepo },
    suppliers: { get: getSuppliersRepo, count: countSuppliersRepo },
    orders: { get: getOrdersRepo, count: countOrdersRepo },
};

// Retorna os dados de um recurso do tenant, paginado e em formato plano.
export const getExportData = (resource, tenantId, skip, limit, sort) => {
    const handler = RESOURCE_HANDLERS[resource];
    if (!handler) return Promise.resolve([]);

    const filter = baseQuery(tenantId, false);
    return handler.get(filter, skip, limit, sort).lean();
};

// Retorna o total de registros de um recurso do tenant.
export const countExportData = (resource, tenantId) => {
    const handler = RESOURCE_HANDLERS[resource];
    if (!handler) return Promise.resolve(0);

    const filter = baseQuery(tenantId, false);
    return handler.count(filter);
};
