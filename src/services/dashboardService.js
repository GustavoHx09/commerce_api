import { countUsers, countProducts } from "../repositories/dashboardRepo.js";

export const getDashboardData = async () => {
  const totalUsers = await countUsers();
  const totalProducts = await countProducts();

  return {
    totalUsers,
    totalProducts
  };
};