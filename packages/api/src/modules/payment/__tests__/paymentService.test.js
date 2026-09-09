import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPaymentService, getPaymentsService, cancelPaymentsByOrderService } from '../paymentService.js';

const mockCreateRepo = vi.fn();
const mockGetPaymentsRepo = vi.fn();
const mockCountPaymentsRepo = vi.fn();
const mockGetPaymentByIdRepo = vi.fn();
const mockCancelPaymentsByOrderRepo = vi.fn();

vi.mock('../paymentRepo.js', () => ({
    createPaymentRepo: (...args) => mockCreateRepo(...args),
    getPaymentsRepo: (...args) => mockGetPaymentsRepo(...args),
    countPaymentsRepo: (...args) => mockCountPaymentsRepo(...args),
    getPaymentByIdRepo: (...args) => mockGetPaymentByIdRepo(...args),
    cancelPaymentsByOrderRepo: (...args) => mockCancelPaymentsByOrderRepo(...args),
}));

describe('paymentService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createPaymentService', () => {
        it('creates a cash payment with amount greater than total', async () => {
            mockCreateRepo.mockResolvedValue({ _id: 'p1', amount: 120, method: 'cash' });

            const result = await createPaymentService({
                orderId: 'o1',
                cashierId: 'c1',
                amount: 120,
                method: 'cash',
                reference: '',
            }, 'tenantA', 'u1');

            expect(result._id).toBe('p1');
            expect(mockCreateRepo).toHaveBeenCalledWith(expect.objectContaining({
                tenantId: 'tenantA',
                orderId: 'o1',
                cashierId: 'c1',
                amount: 120,
                method: 'cash',
            }), { session: undefined });
        });

        it('rejects invalid method', async () => {
            await expect(createPaymentService({
                orderId: 'o1',
                amount: 100,
                method: 'bitcoin',
            }, 'tenantA', 'u1')).rejects.toMatchObject({ statusCode: 400 });
        });

        it('rejects negative amount', async () => {
            await expect(createPaymentService({
                orderId: 'o1',
                amount: -10,
                method: 'cash',
            }, 'tenantA', 'u1')).rejects.toMatchObject({ statusCode: 400 });
        });
    });

    describe('getPaymentsService', () => {
        it('lists payments with pagination', async () => {
            mockGetPaymentsRepo.mockResolvedValue([{ _id: 'p1' }]);
            mockCountPaymentsRepo.mockResolvedValue(1);

            const result = await getPaymentsService({}, 'tenantA');

            expect(result.data).toHaveLength(1);
            expect(mockGetPaymentsRepo).toHaveBeenCalledWith(
                expect.objectContaining({ tenantId: 'tenantA', deletedAt: null }),
                expect.any(Number),
                expect.any(Number),
                expect.any(Object)
            );
        });
    });

    describe('cancelPaymentsByOrderService', () => {
        it('cancels payments by order', async () => {
            mockCancelPaymentsByOrderRepo.mockResolvedValue({ modifiedCount: 1 });

            const result = await cancelPaymentsByOrderService('o1', 'tenantA', 'u1', { session: 'sess' });

            expect(result.modifiedCount).toBe(1);
            expect(mockCancelPaymentsByOrderRepo).toHaveBeenCalledWith('o1', 'tenantA', 'u1', { session: 'sess' });
        });
    });
});
