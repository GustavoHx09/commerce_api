import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPlatformMetricsService } from '../platformService.js';

const mockGetTenants = vi.fn();
const mockCountUsers = vi.fn();
const mockCountProducts = vi.fn();
const mockGetSales = vi.fn();

vi.mock('../platformRepo.js', () => ({
    getTenantsRepo: (...args) => mockGetTenants(...args),
    countUsersByTenantRepo: (...args) => mockCountUsers(...args),
    countProductsByTenantRepo: (...args) => mockCountProducts(...args),
    getSalesByTenantRepo: (...args) => mockGetSales(...args),
}));

describe('platformService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetTenants.mockResolvedValue([
            { _id: 't1', name: 'Loja A', displayName: 'Loja A Exemplo', isActive: true, createdAt: new Date() },
            { _id: 't2', name: 'Loja B', displayName: null, isActive: false, createdAt: new Date() },
        ]);
        mockCountUsers.mockResolvedValue([{ _id: 't1', total: 3 }]);
        mockCountProducts.mockResolvedValue([{ _id: 't1', total: 10 }]);
        mockGetSales.mockResolvedValue([
            { _id: 't1', orders: 5, revenue: 500, lastOrderAt: new Date('2026-10-30') },
        ]);
    });

    it('aggregates per-company stats and platform totals', async () => {
        const result = await getPlatformMetricsService();

        expect(result.totals).toEqual({
            tenants: 2,
            activeTenants: 1,
            users: 3,
            products: 10,
            orders: 5,
            revenue: 500,
        });

        const lojaA = result.companies[0];
        expect(lojaA.name).toBe('Loja A Exemplo');
        expect(lojaA.users).toBe(3);
        expect(lojaA.orders).toBe(5);
        expect(lojaA.revenue).toBe(500);
        expect(lojaA.lastOrderAt).toEqual(new Date('2026-10-30'));
    });

    it('returns zeros for tenants without activity', async () => {
        const result = await getPlatformMetricsService();
        const lojaB = result.companies[1];

        expect(lojaB.name).toBe('Loja B');
        expect(lojaB.users).toBe(0);
        expect(lojaB.orders).toBe(0);
        expect(lojaB.revenue).toBe(0);
        expect(lojaB.lastOrderAt).toBeNull();
    });
});
