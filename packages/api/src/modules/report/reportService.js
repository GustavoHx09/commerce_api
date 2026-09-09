import {
    getSalesSummary,
    getTopProducts,
    getInventoryReport,
    getInventorySummary,
    getStockMovementsReport,
    countStockMovements,
    getCashFlowSales,
    getCashFlowBills,
    getCashFlowMovements,
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

// Valida o agrupamento do fluxo de caixa, usando 'day' como padrão.
const getCashFlowGroupBy = (value) => {
    const group = isEmpty(value) ? "day" : String(value).toLowerCase();
    if (!VALID_GROUP_BY.includes(group)) {
        throwValidationError("Agrupamento inválido. Valores aceitos: day, month, year, none");
    }
    return group;
};

// Calcula os totais de um período a partir dos valores parciais.
const buildCashFlowTotals = (values) => {
    const sales = values.sales || 0;
    const billsReceive = values.billsReceive || 0;
    const billsPay = values.billsPay || 0;
    const suprimentos = values.suprimentos || 0;
    const sangrias = values.sangrias || 0;
    const inflow = sales + billsReceive + suprimentos;
    const outflow = billsPay + sangrias;
    const balance = inflow - outflow;

    return { sales, billsReceive, billsPay, suprimentos, sangrias, inflow, outflow, balance };
};

// Mescla os arrays de vendas, contas e movimentações por período.
const mergeCashFlowByPeriod = (sales, bills, movements) => {
    const map = new Map();

    for (const item of sales) {
        const current = map.get(item.period) || {};
        map.set(item.period, { ...current, sales: item.total });
    }

    for (const item of bills) {
        const current = map.get(item.period) || {};
        map.set(item.period, { ...current, billsReceive: item.receive, billsPay: item.pay });
    }

    for (const item of movements) {
        const current = map.get(item.period) || {};
        map.set(item.period, { ...current, suprimentos: item.suprimentos, sangrias: item.sangrias });
    }

    const data = [];
    const keys = Array.from(map.keys()).sort();

    for (const period of keys) {
        const totals = buildCashFlowTotals(map.get(period));
        data.push({ period, ...totals });
    }

    const summary = data.reduce(
        (acc, item) => ({
            sales: acc.sales + item.sales,
            billsReceive: acc.billsReceive + item.billsReceive,
            billsPay: acc.billsPay + item.billsPay,
            suprimentos: acc.suprimentos + item.suprimentos,
            sangrias: acc.sangrias + item.sangrias,
            inflow: acc.inflow + item.inflow,
            outflow: acc.outflow + item.outflow,
            balance: acc.balance + item.balance,
        }),
        { sales: 0, billsReceive: 0, billsPay: 0, suprimentos: 0, sangrias: 0, inflow: 0, outflow: 0, balance: 0 }
    );

    return { data, summary };
};

// Relatório de fluxo de caixa consolidado.
export const getCashFlowReportService = async (query, tenantId) => {
    const { start, end } = getDateRange(query);
    const groupBy = getCashFlowGroupBy(query.groupBy);

    const [sales, bills, movements] = await Promise.all([
        getCashFlowSales(tenantId, start, end, groupBy),
        getCashFlowBills(tenantId, start, end, groupBy),
        getCashFlowMovements(tenantId, start, end, groupBy),
    ]);

    if (groupBy === "none") {
        const summary = buildCashFlowTotals({
            sales: sales.total,
            billsReceive: bills.receive,
            billsPay: bills.pay,
            suprimentos: movements.suprimentos,
            sangrias: movements.sangrias,
        });

        return { start, end, groupBy, summary };
    }

    const { data, summary } = mergeCashFlowByPeriod(sales, bills, movements);

    return { start, end, groupBy, data, summary };
};
