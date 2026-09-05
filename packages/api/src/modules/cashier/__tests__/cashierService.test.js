import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCashierService, closeCashierService, createCashierMovementService } from '../cashierService.js';

const mockCreateCashierRepo = vi.fn();
const mockGetCashiersRepo = vi.fn();
const mockCountCashiersRepo = vi.fn();
const mockGetCashierByIdRepo = vi.fn();
const mockGetOpenCashierByUserRepo = vi.fn();
const mockUpdateCashierRepo = vi.fn();
const mockSoftDeleteCashierRepo = vi.fn();
const mockCreateCashierMovementRepo = vi.fn();
const mockGetCashierMovementsRepo = vi.fn();
const mockCountCashierMovementsRepo = vi.fn();
const mockGetPaidOrdersTotalByCashier = vi.fn();
const mockAuditAction = vi.fn();

vi.mock('../cashierRepo.js', () => ({
    createCashierRepo: (...args) => mockCreateCashierRepo(...args),
    getCashiersRepo: (...args) => mockGetCashiersRepo(...args),
    countCashiersRepo: (...args) => mockCountCashiersRepo(...args),
    getCashierByIdRepo: (...args) => mockGetCashierByIdRepo(...args),
    getOpenCashierByUserRepo: (...args) => mockGetOpenCashierByUserRepo(...args),
    updateCashierRepo: (...args) => mockUpdateCashierRepo(...args),
    softDeleteCashierRepo: (...args) => mockSoftDeleteCashierRepo(...args),
    restoreCashierRepo: vi.fn(),
    hardDeleteCashierRepo: vi.fn(),
    createCashierMovementRepo: (...args) => mockCreateCashierMovementRepo(...args),
    getCashierMovementsRepo: (...args) => mockGetCashierMovementsRepo(...args),
    countCashierMovementsRepo: (...args) => mockCountCashierMovementsRepo(...args),
}));

vi.mock('../../order/orderRepo.js', () => ({
    getPaidOrdersTotalByCashier: (...args) => mockGetPaidOrdersTotalByCashier(...args),
    countOrdersByCashierRepo: vi.fn(),
    countOrdersByProductRepo: vi.fn(),
    countOrdersByCustomerRepo: vi.fn(),
}));

vi.mock('../../audit/auditHelpers.js', () => ({
    auditAction: (...args) => mockAuditAction(...args),
    toPlain: (doc) => doc,
}));

describe('cashierService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createCashierService', () => {
        it('opens a cashier with valid initial amount', async () => {
            mockGetOpenCashierByUserRepo.mockResolvedValue(null);
            mockCreateCashierRepo.mockResolvedValue({ _id: 'c1', status: 'open' });

            const result = await createCashierService({ initialAmount: 100 }, 'tenantA', 'u1');

            expect(result.status).toBe('open');
            expect(mockCreateCashierRepo).toHaveBeenCalledWith(expect.objectContaining({
                tenantId: 'tenantA',
                openedBy: 'u1',
                initialAmount: 100,
                status: 'open',
            }));
            expect(mockAuditAction).toHaveBeenCalled();
        });

        it('rejects negative initial amount', async () => {
            await expect(createCashierService({ initialAmount: -10 }, 'tenantA', 'u1')).rejects.toMatchObject({ statusCode: 400 });
        });

        it('rejects opening a second cashier for the same user', async () => {
            mockGetOpenCashierByUserRepo.mockResolvedValue({ _id: 'c1' });

            await expect(createCashierService({ initialAmount: 100 }, 'tenantA', 'u1')).rejects.toMatchObject({ statusCode: 409 });
        });
    });

    describe('closeCashierService', () => {
        it('closes a cashier calculating final amount', async () => {
            mockGetCashierByIdRepo.mockResolvedValue({ _id: 'c1', status: 'open', tenantId: 'tenantA', initialAmount: 100 });
            mockGetCashierMovementsRepo.mockResolvedValue([
                { type: 'suprimento', amount: 50 },
                { type: 'sangria', amount: 20 },
            ]);
            mockGetPaidOrdersTotalByCashier.mockResolvedValue(80);
            mockUpdateCashierRepo.mockResolvedValue({ _id: 'c1', status: 'closed', finalAmount: 210 });

            const result = await closeCashierService('c1', 'tenantA', 'u1');

            expect(result.status).toBe('closed');
            expect(result.finalAmount).toBe(210);
            expect(mockUpdateCashierRepo).toHaveBeenCalled();
        });

        it('throws when cashier is not open', async () => {
            mockGetCashierByIdRepo.mockResolvedValue({ _id: 'c1', status: 'closed' });

            await expect(closeCashierService('c1', 'tenantA', 'u1')).rejects.toMatchObject({ statusCode: 409 });
        });
    });

    describe('createCashierMovementService', () => {
        it('creates a suprimento', async () => {
            mockGetCashierByIdRepo.mockResolvedValue({ _id: 'c1', status: 'open', tenantId: 'tenantA', initialAmount: 100 });
            mockGetCashierMovementsRepo.mockResolvedValue([]);
            mockGetPaidOrdersTotalByCashier.mockResolvedValue(0);
            mockCreateCashierMovementRepo.mockResolvedValue({ _id: 'm1', type: 'suprimento', amount: 50 });

            const result = await createCashierMovementService('c1', { type: 'suprimento', amount: 50 }, 'tenantA', 'u1');

            expect(result.type).toBe('suprimento');
            expect(mockCreateCashierMovementRepo).toHaveBeenCalled();
        });

        it('rejects sangria greater than balance', async () => {
            mockGetCashierByIdRepo.mockResolvedValue({ _id: 'c1', status: 'open', tenantId: 'tenantA', initialAmount: 100 });
            mockGetCashierMovementsRepo.mockResolvedValue([]);
            mockGetPaidOrdersTotalByCashier.mockResolvedValue(0);

            await expect(createCashierMovementService('c1', { type: 'sangria', amount: 150 }, 'tenantA', 'u1')).rejects.toMatchObject({ statusCode: 409 });
        });
    });
});
