import { countUsers, countProducts } from "../repositories/dashboardRepo.js";

// Retorna os dados agregados do dashboard para o tenant informado.
export const getDashboardData = async (tenantId) => {
  const totalUsers = await countUsers(tenantId);
  const totalProducts = await countProducts(tenantId);

  return {
    totalUsers,
    totalProducts,
  };
};
