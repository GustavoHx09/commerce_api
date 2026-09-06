import {
    getSalesSummary,
    getTopProducts,
    getInventoryReport,
    getInventorySummary,
    getStockMovementsReport,
    countStockMovements,
} from "./reportRepo.js";
import { baseQuery } from "../../shared/utils/repositoryHelpers.js";
import { isEmpty, isValidDate } from "../../shared/utils/fieldsValidations.js";
import { throwValidationError } from "../../shared/utils/serviceHelpers.js";
import { getPagination, getSort, paginatedResponse } from "../../shared/utils/paginationHelpers.js";

const VALID_GROUP_BY = ["day", "month", "year", "none"];
const VALID_STOCK_TYPES = ["in", "out", "adjust"];
const DEFAULT_DAYS = 30;
const MAX_TOP_PRODUCTS = 100;

// Converte um valor de data e valida se é válido.
const toDate = (value, fieldName) => {
    if (isEmpty(value)) return null;
    if (!isValidDate(value)) throwValidationError(`${fieldName} inválida`);
    const date = new Date(value);
    if (isNaN(date.getTime())) throwValidationError(`${fieldName} inválida`);
    return date;
};

// Define o intervalo padrão (últimos 30 dias) e valida a ordem das datas.
const getDateRange = (query, defaultDays = DEFAULT_DAYS) => {
    const now = new Date();
    const end = toDate(query.endDate, "Data final") || now;
    const defaultStart = new Date(now);
    defaultStart.setUTCDate(now.getUTCDate() - defaultDays);

    const start = toDate(query.startDate, "Data inicial") || defaultStart;
    if (start > end) throwValidationError("Data inicial não pode ser maior que a data final");

    return { start, end };
};

// Valida e normaliza o tipo de agrupamento solicitado.
const getGroupBy = (value) => {
    const group = isEmpty(value) ? "none" : String(value).toLowerCase();
    if (!VALID_GROUP_BY.includes(group)) {
        throwValidationError("Agrupamento inválido. Valores aceitos: day, month, year, none");
    }
    return group;
};

// Relatório de vendas por período, com agrupamento opcional.
export const getSalesReportService = async (query, tenantId) => {
    const { start, end } = getDateRange(query);
    const groupBy = getGroupBy(query.groupBy);
    const data = await getSalesSummary(tenantId, start, end, groupBy);

    return Array.isArray(data)
        ? { data, start, end, groupBy }
        : { summary: data, start, end, groupBy };
};

// Relatório de produtos mais vendidos no período.
export const getTopProductsReportService = async (query, tenantId) => {
    const { start, end } = getDateRange(query);
    const limit = Math.min(Math.max(1, parseInt(query.limit, 10) || 10), MAX_TOP_PRODUCTS);
    const data = await getTopProducts(tenantId, start, end, limit);

    return { data, start, end, limit };
};

// Relatório de posição de estoque com resumo e lista paginada.
export const getInventoryReportService = async (query, tenantId) => {
    const { page, limit, skip } = getPagination(query);
    const sort = getSort(query, "name");
    const lowStock = query.lowStock === "true";

    const filter = { ...baseQuery(tenantId, false) };
    if (lowStock) filter.$expr = { $lte: ["$quantityInStock", "$minStock"] };

    const [products, summary] = await Promise.all([
        getInventoryReport(filter, skip, limit, sort),
        getInventorySummary(tenantId, lowStock),
    ]);

    return {
        summary,
        products: paginatedResponse(products, page, limit, summary.totalProducts),
    };
};

// Relatório de movimentações de estoque por período, produto e tipo.
export const getStockMovementsReportService = async (query, tenantId) => {
    const { page, limit, skip } = getPagination(query);
    const sort = getSort(query, "createdAt");
    const { start, end } = getDateRange(query);

    const filter = { ...baseQuery(tenantId, false), createdAt: { $gte: start, $lte: end } };

    if (!isEmpty(query.productId)) filter.productId = query.productId;

    if (!isEmpty(query.type)) {
        const type = String(query.type).toLowerCase();
        if (!VALID_STOCK_TYPES.includes(type)) throwValidationError("Tipo de movimentação inválido");
        filter.type = type;
    }

    const [data, total] = await Promise.all([
        getStockMovementsReport(filter, skip, limit, sort),
        countStockMovements(filter),
    ]);

    return paginatedResponse(data, page, limit, total);
};
