import { countUsers, countProducts } from "../repositories/dashboardRepo.js";

export const getDashboardData = async (tenantId) => {
  const totalUsers = await countUsers(tenantId);
  const totalProducts = await countProducts(tenantId);

  return {
    totalUsers,
    totalProducts,
  };
};
