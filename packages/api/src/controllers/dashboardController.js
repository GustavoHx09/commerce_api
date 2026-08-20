import { getDashboardData } from "../services/dashboardService.js";
import { successResponse } from "../utils/responseHelpers.js";

export const getDashboard = async (req, res) => {
    const data = await getDashboardData(req.tenantId);

    if (data.totalUsers === 0) {
        return successResponse(res, data, "Não existe usuários cadastrados!");
    }

    if (data.totalProducts === 0) {
        return successResponse(res, data, "Não existe produtos cadastrados!");
    }

    return successResponse(res, data, "Dashboard carregado com sucesso");
};
