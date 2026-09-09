import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getDashboardData } from '../dashboardService.js';

const mockCountUsers = vi.fn();
const mockCountProducts = vi.fn();
const mockCountCustomers = vi.fn();
const mockGetSalesSummary = vi.fn();
const mockGetLowStockProducts = vi.fn();
const mockGetOpenCashiers = vi.fn();
const mockGetCashierMovementsSummary = vi.fn();
const mockGetOrdersTotalByCashiers = vi.fn();

vi.mock('../dashboardRepo.js', () => ({
    countUsers: (...args) => mockCountUsers(...args),
    countProducts: (...args) => mockCountProducts(...args),
    countCustomers: (...args) => mockCountCustomers(...args),
    getSalesSummary: (...args) => mockGetSalesSummary(...args),
    getLowStockProducts: (...args) => mockGetLowStockProducts(...args),
    getOpenCashiers: (...args) => mockGetOpenCashiers(...args),
    getCashierMovementsSummary: (...args) => mockGetCashierMovementsSummary(...args),
    getOrdersTotalByCashiers: (...args) => mockGetOrdersTotalByCashiers(...args),
}));

describe('dashboardService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-09-05T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns full dashboard data', async () => {
        mockCountUsers.mockResolvedValue(3);
        mockCountProducts.mockResolvedValue(10);
        mockCountCustomers.mockResolvedValue(5);
        mockGetSalesSummary.mockResolvedValue({ count: 2, total: 150 });
        mockGetLowStockProducts.mockResolvedValue([{ _id: 'p1', name: 'Produto', sku: 'P1', quantityInStock: 2, minStock: 5 }]);
        mockGetOpenCashiers.mockResolvedValue([{ _id: 'c1', initialAmount: 100 }]);
        mockGetCashierMovementsSummary.mockResolvedValue([
            { _id: 'suprimento', total: 50 },
            { _id: 'sangria', total: 20 },
        ]);
        mockGetOrdersTotalByCashiers.mockResolvedValue(80);

        const result = await getDashboardData('tenantA');

        expect(result.totalUsers).toBe(3);
        expect(result.totalProducts).toBe(10);
        expect(result.totalCustomers).toBe(5);
        expect(result.salesToday.count).toBe(2);
        expect(result.salesToday.total).toBe(150);
        expect(result.salesWeek.total).toBe(150);
        expect(result.salesMonth.total).toBe(150);
        expect(result.lowStockProducts).toHaveLength(1);
        expect(result.openCashiersCount).toBe(1);
        expect(result.totalInCashier).toBe(210); // 100 + 80 + 50 - 20
        expect(mockGetSalesSummary).toHaveBeenCalledTimes(3);
    });

    it('returns zero cashier balance when no cashiers are open', async () => {
        mockCountUsers.mockResolvedValue(0);
        mockCountProducts.mockResolvedValue(0);
        mockCountCustomers.mockResolvedValue(0);
        mockGetSalesSummary.mockResolvedValue({ count: 0, total: 0 });
        mockGetLowStockProducts.mockResolvedValue([]);
        mockGetOpenCashiers.mockResolvedValue([]);

        const result = await getDashboardData('tenantA');

        expect(result.openCashiersCount).toBe(0);
        expect(result.totalInCashier).toBe(0);
    });
});
