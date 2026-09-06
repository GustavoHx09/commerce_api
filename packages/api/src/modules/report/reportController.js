import {
    getSalesReportService,
    getTopProductsReportService,
    getInventoryReportService,
    getStockMovementsReportService,
    getCashFlowReportService,
} from "./reportService.js";
import { successResponse } from "../../shared/utils/responseHelpers.js";

// Retorna relatório de vendas por período.
export const getSalesReport = async (req, res) => {
    const result = await getSalesReportService(req.query, req.tenantId);
    return successResponse(res, result, "Relatório de vendas carregado com sucesso");
};

// Retorna relatório de produtos mais vendidos no período.
export const getTopProductsReport = async (req, res) => {
    const result = await getTopProductsReportService(req.query, req.tenantId);
    return successResponse(res, result, "Produtos mais vendidos carregados com sucesso");
};

// Retorna relatório de posição de estoque.
export const getInventoryReport = async (req, res) => {
    const result = await getInventoryReportService(req.query, req.tenantId);
    return successResponse(res, result, "Relatório de estoque carregado com sucesso");
};

// Retorna relatório de movimentações de estoque.
export const getStockMovementsReport = async (req, res) => {
    const result = await getStockMovementsReportService(req.query, req.tenantId);
    return successResponse(res, result, "Movimentações de estoque carregadas com sucesso");
};

// Retorna relatório de fluxo de caixa consolidado.
export const getCashFlowReport = async (req, res) => {
    const result = await getCashFlowReportService(req.query, req.tenantId);
    return successResponse(res, result, "Fluxo de caixa carregado com sucesso");
};
