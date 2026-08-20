import { getDashboardData } from "../services/dashboardService.js";
import { successResponse } from "../utils/responseHelpers.js";

// Retorna os dados resumidos do dashboard para o tenant atual.
export const getDashboard = async (req, res) => {
    const data = await getDashboardData(req.tenantId);

    if (data.totalUsers === 0) {
        return successResponse(res, data, "Não existem usuários cadastrados");
    }

    if (data.totalProducts === 0) {
        return successResponse(res, data, "Não existem produtos cadastrados");
    }

    return successResponse(res, data, "Dashboard carregado com sucesso");
};
