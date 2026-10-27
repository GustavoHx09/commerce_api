import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBillService, getBillsService, payBillService, cancelBillService, updateBillService } from '../billService.js';

const mockCreateBillRepo = vi.fn();
const mockGetBillsRepo = vi.fn();
const mockCountBillsRepo = vi.fn();
const mockGetBillByIdRepo = vi.fn();
const mockUpdateBillRepo = vi.fn();
const mockSoftDeleteBillRepo = vi.fn();
const mockRestoreBillRepo = vi.fn();
const mockAuditAction = vi.fn();

vi.mock('../billRepo.js', () => ({
    createBillRepo: (...args) => mockCreateBillRepo(...args),
    getBillsRepo: (...args) => mockGetBillsRepo(...args),
    countBillsRepo: (...args) => mockCountBillsRepo(...args),
    getBillByIdRepo: (...args) => mockGetBillByIdRepo(...args),
    updateBillRepo: (...args) => mockUpdateBillRepo(...args),
    softDeleteBillRepo: (...args) => mockSoftDeleteBillRepo(...args),
    restoreBillRepo: (...args) => mockRestoreBillRepo(...args),
}));

const mockGetCashierByIdRepo = vi.fn();
const mockCalculateCashierBalance = vi.fn();
const mockCreateSystemCashierMovement = vi.fn();

vi.mock('../../audit/auditHelpers.js', () => ({
    auditAction: (...args) => mockAuditAction(...args),
    toPlain: (doc) => doc,
}));

vi.mock('../../../shared/utils/transactionHelpers.js', () => ({
    withTransaction: async (callback) => callback({}),
}));

vi.mock('../../cashier/cashierRepo.js', () => ({
    getCashierByIdRepo: (...args) => mockGetCashierByIdRepo(...args),
}));

vi.mock('../../cashier/cashierService.js', () => ({
    calculateCashierBalance: (...args) => mockCalculateCashierBalance(...args),
    createSystemCashierMovement: (...args) => mockCreateSystemCashierMovement(...args),
}));

describe('billService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createBillService', () => {
        it('creates a valid bill to pay', async () => {
            mockCreateBillRepo.mockResolvedValue({ _id: 'b1', type: 'pay', amount: 100 });

            const result = await createBillService({
                type: 'pay',
                description: 'Aluguel',
                amount: 100,
                dueDate: '2026-09-10',
            }, 'tenantA', 'u1');

            expect(result.type).toBe('pay');
            expect(mockCreateBillRepo).toHaveBeenCalled();
            expect(mockAuditAction).toHaveBeenCalled();
        });

        it('rejects invalid bill type', async () => {
            await expect(createBillService({
                type: 'invalid',
                description: 'Teste',
                amount: 100,
                dueDate: '2026-09-10',
            }, 'tenantA', 'u1')).rejects.toMatchObject({ statusCode: 400 });
        });

        it('rejects amount less than or equal to zero', async () => {
            await expect(createBillService({
                type: 'pay',
                description: 'Teste',
                amount: 0,
                dueDate: '2026-09-10',
            }, 'tenantA', 'u1')).rejects.toMatchObject({ statusCode: 400 });
        });

        it('rejects invalid due date', async () => {
            await expect(createBillService({
                type: 'pay',
                description: 'Teste',
                amount: 100,
                dueDate: 'não é data',
            }, 'tenantA', 'u1')).rejects.toMatchObject({ statusCode: 400 });
        });
    });

    describe('getBillsService', () => {
        it('lists bills with filters', async () => {
            mockGetBillsRepo.mockResolvedValue([{ _id: 'b1' }]);
            mockCountBillsRepo.mockResolvedValue(1);

            const result = await getBillsService({ type: 'pay' }, 'tenantA');

            expect(result.data).toHaveLength(1);
            expect(mockGetBillsRepo).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'pay', tenantId: 'tenantA' }),
                expect.any(Number),
                expect.any(Number),
                expect.any(Object)
            );
        });
    });

    describe('payBillService', () => {
        it('pays a pending bill fully external when no cashier is informed', async () => {
            mockGetBillByIdRepo.mockResolvedValue({ _id: 'b1', type: 'pay', status: 'pending', amount: 100, description: 'Aluguel' });
            mockUpdateBillRepo.mockResolvedValue({ _id: 'b1', status: 'paid' });

            const result = await payBillService('b1', {}, 'tenantA', 'u1');

            expect(result.status).toBe('paid');
            expect(mockUpdateBillRepo).toHaveBeenCalledWith(
                'b1',
                expect.objectContaining({ status: 'paid', cashierAmount: 0, externalAmount: 100 }),
                'tenantA',
                { session: {} }
            );
            expect(mockCreateSystemCashierMovement).not.toHaveBeenCalled();
        });

        it('pays part from the cashier and part externally', async () => {
            mockGetBillByIdRepo.mockResolvedValue({ _id: 'b1', type: 'pay', status: 'pending', amount: 100, description: 'Fornecedor' });
            mockGetCashierByIdRepo.mockResolvedValue({ _id: 'c1', status: 'open' });
            mockCalculateCashierBalance.mockResolvedValue(80);
            mockUpdateBillRepo.mockResolvedValue({ _id: 'b1', status: 'paid' });

            const result = await payBillService('b1', {
                cashierId: 'c1',
                externalAmount: 30,
                externalMethod: 'pix',
            }, 'tenantA', 'u1');

            expect(result.status).toBe('paid');
            expect(mockCreateSystemCashierMovement).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'pagamento_conta', amount: 70, billId: 'b1' }),
                'u1',
                { session: {} }
            );
            expect(mockUpdateBillRepo).toHaveBeenCalledWith(
                'b1',
                expect.objectContaining({ cashierAmount: 70, externalAmount: 30, externalMethod: 'pix' }),
                'tenantA',
                { session: {} }
            );
        });

        it('rejects when cashier balance is insufficient', async () => {
            mockGetBillByIdRepo.mockResolvedValue({ _id: 'b1', type: 'pay', status: 'pending', amount: 100, description: 'Fornecedor' });
            mockGetCashierByIdRepo.mockResolvedValue({ _id: 'c1', status: 'open' });
            mockCalculateCashierBalance.mockResolvedValue(50);

            await expect(payBillService('b1', { cashierId: 'c1' }, 'tenantA', 'u1'))
                .rejects.toMatchObject({ statusCode: 409 });
        });

        it('rejects paying a non-pending bill', async () => {
            mockGetBillByIdRepo.mockResolvedValue({ _id: 'b1', status: 'paid' });

            await expect(payBillService('b1', {}, 'tenantA', 'u1')).rejects.toMatchObject({ statusCode: 409 });
        });
    });

    describe('cancelBillService', () => {
        it('cancels a pending bill', async () => {
            mockGetBillByIdRepo.mockResolvedValue({ _id: 'b1', status: 'pending' });
            mockUpdateBillRepo.mockResolvedValue({ _id: 'b1', status: 'cancelled' });

            const result = await cancelBillService('b1', 'tenantA', 'u1');

            expect(result.status).toBe('cancelled');
        });

        it('rejects cancelling an already cancelled bill', async () => {
            mockGetBillByIdRepo.mockResolvedValue({ _id: 'b1', status: 'cancelled' });

            await expect(cancelBillService('b1', 'tenantA', 'u1')).rejects.toMatchObject({ statusCode: 409 });
        });
    });

    describe('updateBillService', () => {
        it('updates amount and due date', async () => {
            mockGetBillByIdRepo.mockResolvedValue({ _id: 'b1', status: 'pending' });
            mockUpdateBillRepo.mockResolvedValue({ _id: 'b1', amount: 200, dueDate: new Date('2026-09-15') });

            const result = await updateBillService('b1', { amount: 200, dueDate: '2026-09-15' }, 'tenantA', 'u1');

            expect(result.amount).toBe(200);
            expect(mockUpdateBillRepo).toHaveBeenCalled();
        });

        it('rejects updating a cancelled bill', async () => {
            mockGetBillByIdRepo.mockResolvedValue({ _id: 'b1', status: 'cancelled' });

            await expect(updateBillService('b1', { amount: 200 }, 'tenantA', 'u1')).rejects.toMatchObject({ statusCode: 409 });
        });
    });
});
