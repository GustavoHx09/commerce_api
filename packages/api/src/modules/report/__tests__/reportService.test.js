import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    getSalesReportService,
    getTopProductsReportService,
    getInventoryReportService,
    getStockMovementsReportService,
} from '../reportService.js';

const mockGetSalesSummary = vi.fn();
const mockGetTopProducts = vi.fn();
const mockGetInventoryReport = vi.fn();
const mockGetInventorySummary = vi.fn();
const mockGetStockMovementsReport = vi.fn();
const mockCountStockMovements = vi.fn();

vi.mock('../reportRepo.js', () => ({
    getSalesSummary: (...args) => mockGetSalesSummary(...args),
    getTopProducts: (...args) => mockGetTopProducts(...args),
    getInventoryReport: (...args) => mockGetInventoryReport(...args),
    getInventorySummary: (...args) => mockGetInventorySummary(...args),
    getStockMovementsReport: (...args) => mockGetStockMovementsReport(...args),
    countStockMovements: (...args) => mockCountStockMovements(...args),
}));

describe('reportService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-09-06T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns sales report grouped by day', async () => {
        mockGetSalesSummary.mockResolvedValue([{ period: '2026-09-05', count: 2, total: 100 }]);

        const result = await getSalesReportService({ groupBy: 'day' }, 'tenantA');

        expect(result.data).toHaveLength(1);
        expect(result.groupBy).toBe('day');
        expect(mockGetSalesSummary).toHaveBeenCalledWith('tenantA', expect.any(Date), expect.any(Date), 'day');
    });

    it('returns sales summary when groupBy is none', async () => {
        mockGetSalesSummary.mockResolvedValue({ count: 5, total: 250 });

        const result = await getSalesReportService({ startDate: '2026-09-01', endDate: '2026-09-06' }, 'tenantA');

        expect(result.summary).toEqual({ count: 5, total: 250 });
        expect(result.groupBy).toBe('none');
        expect(mockGetSalesSummary).toHaveBeenCalledWith(
            'tenantA',
            new Date('2026-09-01T00:00:00.000Z'),
            new Date('2026-09-06T00:00:00.000Z'),
            'none'
        );
    });

    it('rejects invalid groupBy', async () => {
        await expect(getSalesReportService({ groupBy: 'hour' }, 'tenantA')).rejects.toThrow('Agrupamento inválido');
    });

    it('rejects start date greater than end date', async () => {
        await expect(
            getSalesReportService({ startDate: '2026-09-10', endDate: '2026-09-01' }, 'tenantA')
        ).rejects.toThrow('Data inicial não pode ser maior');
    });

    it('rejects invalid dates', async () => {
        await expect(getSalesReportService({ startDate: 'não-é-data' }, 'tenantA')).rejects.toThrow('Data inicial inválida');
    });

    it('returns top products report', async () => {
        mockGetTopProducts.mockResolvedValue([{ productId: 'p1', name: 'Produto A', quantity: 5, revenue: 75 }]);

        const result = await getTopProductsReportService({ limit: '5' }, 'tenantA');

        expect(result.data).toHaveLength(1);
        expect(result.limit).toBe(5);
        expect(mockGetTopProducts).toHaveBeenCalledWith('tenantA', expect.any(Date), expect.any(Date), 5);
    });

    it('caps top products limit at 100', async () => {
        mockGetTopProducts.mockResolvedValue([]);

        await getTopProductsReportService({ limit: '500' }, 'tenantA');

        expect(mockGetTopProducts).toHaveBeenCalledWith('tenantA', expect.any(Date), expect.any(Date), 100);
    });

    it('returns inventory report with summary', async () => {
        mockGetInventorySummary.mockResolvedValue({
            totalProducts: 2,
            lowStockCount: 1,
            totalCostValue: 50,
            totalSaleValue: 100,
        });
        mockGetInventoryReport.mockResolvedValue([{ name: 'Produto A' }]);

        const result = await getInventoryReportService({ lowStock: 'true' }, 'tenantA');

        expect(result.summary.lowStockCount).toBe(1);
        expect(result.products.data).toHaveLength(1);
        expect(mockGetInventoryReport).toHaveBeenCalledWith(
            expect.objectContaining({ tenantId: 'tenantA' }),
            0,
            10,
            { name: -1 }
        );
    });

    it('returns stock movements report with pagination', async () => {
        mockGetStockMovementsReport.mockResolvedValue([{ productId: 'p1', type: 'out' }]);
        mockCountStockMovements.mockResolvedValue(1);

        const result = await getStockMovementsReportService({ productId: 'p1', type: 'out' }, 'tenantA');

        expect(result.data).toHaveLength(1);
        expect(result.pagination.total).toBe(1);
        expect(mockGetStockMovementsReport).toHaveBeenCalledWith(
            expect.objectContaining({ productId: 'p1', type: 'out' }),
            0,
            10,
            { createdAt: -1 }
        );
    });

    it('rejects invalid stock movement type', async () => {
        await expect(
            getStockMovementsReportService({ type: 'invalid' }, 'tenantA')
        ).rejects.toThrow('Tipo de movimentação inválido');
    });
});
