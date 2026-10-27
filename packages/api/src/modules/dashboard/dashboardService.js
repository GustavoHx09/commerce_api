import {
    countUsers,
    countProducts,
    countCustomers,
    getSalesSummary,
    getCanceledSalesSummary,
    getLowStockProducts,
    getOpenCashiers,
    getCashierMovementsSummary,
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

// Tipos de movimentação que entram dinheiro no caixa físico.
const INFLOW_TYPES = ["suprimento", "venda", "recebimento_conta"];

// Calcula o saldo total em caixas abertos pela soma assinada das movimentações.
const calculateCashierBalance = async (tenantId) => {
    const openCashiers = await getOpenCashiers(tenantId);
    const cashierIds = openCashiers.map((cashier) => cashier._id);

    if (!cashierIds.length) {
        return { openCashiersCount: 0, totalBalance: 0 };
    }

    const movements = await getCashierMovementsSummary(cashierIds);
    const initialAmount = openCashiers.reduce((sum, cashier) => sum + Number(cashier.initialAmount || 0), 0);

    const movementsTotal = movements.reduce(
        (sum, m) => INFLOW_TYPES.includes(m._id) ? sum + m.total : sum - m.total,
        0
    );

    return { openCashiersCount: openCashiers.length, totalBalance: initialAmount + movementsTotal };
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
        canceledMonth,
        lowStockProducts,
        { openCashiersCount, totalBalance },
    ] = await Promise.all([
        countUsers(tenantId),
        countProducts(tenantId),
        countCustomers(tenantId),
        getSalesSummary(tenantId, todayStart, now),
        getSalesSummary(tenantId, weekStart, now),
        getSalesSummary(tenantId, monthStart, now),
        getCanceledSalesSummary(tenantId, monthStart, now),
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
        canceledMonth,
        lowStockProducts,
        openCashiersCount,
        totalInCashier: totalBalance,
    };
};
