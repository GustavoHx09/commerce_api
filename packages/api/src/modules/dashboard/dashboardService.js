import {
    countUsers,
    countProducts,
    countCustomers,
    getSalesSummary,
    getLowStockProducts,
    getOpenCashiers,
    getCashierMovementsSummary,
    getOrdersTotalByCashiers,
} from "./dashboardRepo.js";

// Calcula o início do dia, da semana (domingo) e do mês em UTC.
const getPeriodStartDates = () => {
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const weekStart = new Date(todayStart);
    weekStart.setUTCDate(todayStart.getUTCDate() - todayStart.getUTCDay());

    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    return { todayStart, weekStart, monthStart, now };
};

// Calcula o saldo total em caixas abertos: inicial + vendas + suprimentos - sangrias.
const calculateCashierBalance = async (tenantId) => {
    const openCashiers = await getOpenCashiers(tenantId);
    const cashierIds = openCashiers.map((cashier) => cashier._id);

    if (!cashierIds.length) {
        return { openCashiersCount: 0, totalBalance: 0 };
    }

    const [movements, ordersTotal] = await Promise.all([
        getCashierMovementsSummary(cashierIds),
        getOrdersTotalByCashiers(cashierIds, tenantId),
    ]);

    const suprimentos = movements.find((m) => m._id === "suprimento")?.total || 0;
    const sangrias = movements.find((m) => m._id === "sangria")?.total || 0;
    const initialAmount = openCashiers.reduce((sum, cashier) => sum + Number(cashier.initialAmount || 0), 0);

    const totalBalance = initialAmount + ordersTotal + suprimentos - sangrias;

    return { openCashiersCount: openCashiers.length, totalBalance };
};

// Retorna os dados agregados do dashboard para o tenant informado.
export const getDashboardData = async (tenantId) => {
    const { todayStart, weekStart, monthStart, now } = getPeriodStartDates();

    const [
        totalUsers,
        totalProducts,
        totalCustomers,
        salesToday,
        salesWeek,
        salesMonth,
        lowStockProducts,
        { openCashiersCount, totalBalance },
    ] = await Promise.all([
        countUsers(tenantId),
        countProducts(tenantId),
        countCustomers(tenantId),
        getSalesSummary(tenantId, todayStart, now),
        getSalesSummary(tenantId, weekStart, now),
        getSalesSummary(tenantId, monthStart, now),
        getLowStockProducts(tenantId),
        calculateCashierBalance(tenantId),
    ]);

    return {
        totalUsers,
        totalProducts,
        totalCustomers,
        salesToday,
        salesWeek,
        salesMonth,
        lowStockProducts,
        openCashiersCount,
        totalInCashier: totalBalance,
    };
};
