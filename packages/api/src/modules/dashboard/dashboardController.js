import { getDashboardData } from "./dashboardService.js";
import { successResponse } from "../../shared/utils/responseHelpers.js";

// Retorna os dados resumidos do dashboard para o tenant atual.
export const getDashboard = async (req, res) => {
    const data = await getDashboardData(req.tenantId);
    return successResponse(res, data, "Dashboard carregado com sucesso");
};
