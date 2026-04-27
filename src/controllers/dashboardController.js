import { getDashboardData } from "../services/dashboardService.js";

export const getDashboard = async (req, res) => {
  try {
    const data = await getDashboardData();

    if (data.totalUsers === 0) {
      return res.status(200).json({
        message: "Não existe usuários cadastrados!"
      })
    };

    if (data.totalProducts === 0) {
      return res.status(200).json({
        message: "Não existe produtos cadastrados!"
      })
    };

    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({
      message: "Erro ao carregar dashboard",
      error: error.message
    });
  }
};