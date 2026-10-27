import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createOrderService, getOrdersService, cancelOrderService } from '../orderService.js';

const mockCreateOrderRepo = vi.fn();
const mockGetOrdersRepo = vi.fn();
const mockCountOrdersRepo = vi.fn();
const mockGetOrderByIdRepo = vi.fn();
const mockUpdateOrderRepo = vi.fn();
const mockDecrementProductStock = vi.fn();
const mockIncrementProductStock = vi.fn();
const mockCreateStockMovementRepo = vi.fn();
const mockGetCustomerByIdRepo = vi.fn();
const mockGetCashierByIdRepo = vi.fn();
const mockCreatePaymentService = vi.fn();
const mockCancelPaymentsByOrderService = vi.fn();
const mockIncrementOrderCounterRepo = vi.fn();
const mockGetTenantByIdRepo = vi.fn();
const mockCreateSystemCashierMovement = vi.fn();
const mockAuditAction = vi.fn();

vi.mock('../../../shared/utils/transactionHelpers.js', () => ({
    withTransaction: async (callback) => callback({}),
}));

vi.mock('../orderRepo.js', () => ({
    createOrderRepo: (...args) => mockCreateOrderRepo(...args),
    getOrdersRepo: (...args) => mockGetOrdersRepo(...args),
    countOrdersRepo: (...args) => mockCountOrdersRepo(...args),
    getOrderByIdRepo: (...args) => mockGetOrderByIdRepo(...args),
    updateOrderRepo: (...args) => mockUpdateOrderRepo(...args),
    getPaidOrdersTotalByCashier: vi.fn(),
    countOrdersByProductRepo: vi.fn(),
    countOrdersByCustomerRepo: vi.fn(),
    countOrdersByCashierRepo: vi.fn(),
}));

vi.mock('../../product/productRepo.js', () => ({
    decrementProductStockRepo: (...args) => mockDecrementProductStock(...args),
    incrementProductStockRepo: (...args) => mockIncrementProductStock(...args),
}));

vi.mock('../../stock/stockMovementRepo.js', () => ({
    createStockMovementRepo: (...args) => mockCreateStockMovementRepo(...args),
    countStockMovementsByProductRepo: vi.fn(),
}));

vi.mock('../../customer/customerRepo.js', () => ({
    getCustomerByIdRepo: (...args) => mockGetCustomerByIdRepo(...args),
}));

vi.mock('../../cashier/cashierRepo.js', () => ({
    getCashierByIdRepo: (...args) => mockGetCashierByIdRepo(...args),
}));

vi.mock('../../payment/paymentService.js', () => ({
    createPaymentService: (...args) => mockCreatePaymentService(...args),
    cancelPaymentsByOrderService: (...args) => mockCancelPaymentsByOrderService(...args),
}));

vi.mock('../../tenant/tenantRepo.js', () => ({
    incrementOrderCounterRepo: (...args) => mockIncrementOrderCounterRepo(...args),
    getTenantByIdRepo: (...args) => mockGetTenantByIdRepo(...args),
}));

vi.mock('../../cashier/cashierService.js', () => ({
    createSystemCashierMovement: (...args) => mockCreateSystemCashierMovement(...args),
}));

vi.mock('../../audit/auditHelpers.js', () => ({
    auditAction: (...args) => mockAuditAction(...args),
    toPlain: (doc) => doc,
}));

describe('orderService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetTenantByIdRepo.mockResolvedValue({ _id: 'tenantA', cashierMode: 'per_operator' });
        mockIncrementOrderCounterRepo.mockResolvedValue({
            _id: 'tenantA',
            orderCounter: 1,
            paymentFees: { creditInstallments: [] },
        });
    });

    describe('createOrderService', () => {
        it('creates a paid order, decrements stock and creates payment', async () => {
            mockGetCashierByIdRepo.mockResolvedValue({ _id: 'c1', status: 'open', openedBy: 'u1' });
            mockGetCustomerByIdRepo.mockResolvedValue(null);
            mockDecrementProductStock.mockResolvedValue({ _id: 'p1', name: 'Produto', sku: 'P1', unit: 'un', price: 50, quantityInStock: 8 });
            mockCreatePaymentService.mockResolvedValue({ _id: 'pay1' });
            mockCreateOrderRepo.mockResolvedValue({ _id: 'o1', status: 'paid', total: 100 });
            mockGetOrderByIdRepo.mockResolvedValue({ _id: 'o1', status: 'paid', total: 100 });

            const result = await createOrderService({
                cashierId: 'c1',
                items: [{ productId: 'p1', quantity: 2 }],
                payment: { method: 'cash', amount: 120 },
            }, 'tenantA', 'u1');

            expect(result.status).toBe('paid');
            expect(result.total).toBe(100);
            expect(mockDecrementProductStock).toHaveBeenCalledWith('p1', 'tenantA', 2, { session: {} });
            expect(mockCreateStockMovementRepo).toHaveBeenCalledWith(expect.objectContaining({ type: 'out', quantity: 2, previousQuantity: 10, newQuantity: 8 }), { session: {} });
            expect(mockCreatePaymentService).toHaveBeenCalled();
            expect(mockCreateOrderRepo).toHaveBeenCalled();
            expect(mockAuditAction).toHaveBeenCalled();
        });

        it('creates an order with combined payments and credit interest', async () => {
            mockGetCashierByIdRepo.mockResolvedValue({ _id: 'c1', status: 'open', openedBy: 'u1' });
            mockGetCustomerByIdRepo.mockResolvedValue(null);
            mockDecrementProductStock.mockResolvedValue({ _id: 'p1', name: 'Produto', sku: 'P1', unit: 'un', price: 100, quantityInStock: 5 });
            mockIncrementOrderCounterRepo.mockResolvedValue({
                _id: 'tenantA',
                orderCounter: 7,
                paymentFees: { creditInstallments: [{ installments: 6, interestPercent: 10 }] },
            });
            mockCreatePaymentService.mockResolvedValue({ _id: 'pay1' });
            mockCreateOrderRepo.mockResolvedValue({ _id: 'o1', status: 'paid' });
            mockGetOrderByIdRepo.mockResolvedValue({ _id: 'o1', status: 'paid' });

            // Venda de 200: 50 no dinheiro + 150 base no crédito 6x com 10% = 165 cobrados.
            const result = await createOrderService({
                cashierId: 'c1',
                items: [{ productId: 'p1', quantity: 2 }],
                payments: [
                    { method: 'cash', amount: 50 },
                    { method: 'credit_card', amount: 165, installments: 6 },
                ],
            }, 'tenantA', 'u1');

            expect(result.status).toBe('paid');
            expect(mockCreatePaymentService).toHaveBeenCalledTimes(2);
            expect(mockCreatePaymentService).toHaveBeenCalledWith(
                expect.objectContaining({ method: 'credit_card', amount: 165, installments: 6, interestPercent: 10, interestAmount: 15 }),
                'tenantA',
                'u1',
                { session: {} }
            );
            // A parte em dinheiro entra no caixa como movimentação "venda".
            expect(mockCreateSystemCashierMovement).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'venda', amount: 50 }),
                'u1',
                { session: {} }
            );
            // A venda recebeu a numeração sequencial do tenant.
            expect(mockCreateOrderRepo).toHaveBeenCalledWith(
                expect.objectContaining({ orderNumber: 7 }),
                { session: {} }
            );
        });

        it('rejects when combined payments do not cover the total', async () => {
            mockGetCashierByIdRepo.mockResolvedValue({ _id: 'c1', status: 'open', openedBy: 'u1' });
            mockGetCustomerByIdRepo.mockResolvedValue(null);
            mockDecrementProductStock.mockResolvedValue({ _id: 'p1', name: 'Produto', sku: 'P1', unit: 'un', price: 50, quantityInStock: 8 });

            await expect(createOrderService({
                cashierId: 'c1',
                items: [{ productId: 'p1', quantity: 2 }],
                payments: [
                    { method: 'pix', amount: 40 },
                    { method: 'cash', amount: 30 },
                ],
            }, 'tenantA', 'u1')).rejects.toMatchObject({ statusCode: 400 });
        });

        it('rejects when product stock is insufficient', async () => {
            mockGetCashierByIdRepo.mockResolvedValue({ _id: 'c1', status: 'open', openedBy: 'u1' });
            mockGetCustomerByIdRepo.mockResolvedValue(null);
            mockDecrementProductStock.mockResolvedValue(null);

            await expect(createOrderService({
                cashierId: 'c1',
                items: [{ productId: 'p1', quantity: 5 }],
                payment: { method: 'cash', amount: 100 },
            }, 'tenantA', 'u1')).rejects.toMatchObject({ statusCode: 409 });
        });

        it('rejects decimal quantity for unit products', async () => {
            mockGetCashierByIdRepo.mockResolvedValue({ _id: 'c1', status: 'open', openedBy: 'u1' });
            mockGetCustomerByIdRepo.mockResolvedValue(null);
            mockDecrementProductStock.mockResolvedValue({ _id: 'p1', name: 'Produto', sku: 'P1', unit: 'un', price: 50, quantityInStock: 8 });

            await expect(createOrderService({
                cashierId: 'c1',
                items: [{ productId: 'p1', quantity: 1.5 }],
                payment: { method: 'cash', amount: 100 },
            }, 'tenantA', 'u1')).rejects.toMatchObject({ statusCode: 400 });
        });

        it('rejects closed cashier', async () => {
            mockGetCashierByIdRepo.mockResolvedValue({ _id: 'c1', status: 'closed', openedBy: 'u1' });

            await expect(createOrderService({
                cashierId: 'c1',
                items: [{ productId: 'p1', quantity: 1 }],
                payment: { method: 'cash', amount: 50 },
            }, 'tenantA', 'u1')).rejects.toMatchObject({ statusCode: 409 });
        });

        it('rejects when cash amount is less than total', async () => {
            mockGetCashierByIdRepo.mockResolvedValue({ _id: 'c1', status: 'open', openedBy: 'u1' });
            mockGetCustomerByIdRepo.mockResolvedValue(null);
            mockDecrementProductStock.mockResolvedValue({ _id: 'p1', name: 'Produto', sku: 'P1', unit: 'un', price: 50, quantityInStock: 8 });

            await expect(createOrderService({
                cashierId: 'c1',
                items: [{ productId: 'p1', quantity: 2 }],
                payment: { method: 'cash', amount: 90 },
            }, 'tenantA', 'u1')).rejects.toMatchObject({ statusCode: 400 });
        });

        it('rejects when discount makes total negative', async () => {
            mockGetCashierByIdRepo.mockResolvedValue({ _id: 'c1', status: 'open', openedBy: 'u1' });
            mockGetCustomerByIdRepo.mockResolvedValue(null);
            mockDecrementProductStock.mockResolvedValue({ _id: 'p1', name: 'Produto', sku: 'P1', unit: 'un', price: 50, quantityInStock: 8 });

            await expect(createOrderService({
                cashierId: 'c1',
                items: [{ productId: 'p1', quantity: 1 }],
                discount: 100,
                payment: { method: 'cash', amount: 0 },
            }, 'tenantA', 'u1')).rejects.toMatchObject({ statusCode: 400 });
        });
    });

    describe('getOrdersService', () => {
        it('lists orders with pagination', async () => {
            mockGetOrdersRepo.mockResolvedValue([{ _id: 'o1' }]);
            mockCountOrdersRepo.mockResolvedValue(1);

            const result = await getOrdersService({}, 'tenantA');

            expect(result.data).toHaveLength(1);
            expect(mockGetOrdersRepo).toHaveBeenCalled();
        });
    });

    describe('cancelOrderService', () => {
        it('cancels a paid order and restores stock', async () => {
            mockGetOrderByIdRepo.mockResolvedValue({
                _id: 'o1',
                status: 'paid',
                items: [{ productId: 'p1', quantity: 2 }],
            });
            mockIncrementProductStock.mockResolvedValue({ _id: 'p1', quantityInStock: 10 });
            mockCancelPaymentsByOrderService.mockResolvedValue({ modifiedCount: 1 });
            mockUpdateOrderRepo.mockResolvedValue({ _id: 'o1', status: 'canceled' });

            const result = await cancelOrderService('o1', { cancelReason: 'Cliente desistiu' }, 'tenantA', 'u1');

            expect(result.status).toBe('canceled');
            expect(mockIncrementProductStock).toHaveBeenCalledWith('p1', 'tenantA', 2, { session: {} });
            expect(mockCreateStockMovementRepo).toHaveBeenCalledWith(expect.objectContaining({ type: 'in', quantity: 2, previousQuantity: 8, newQuantity: 10 }), { session: {} });
            expect(mockCancelPaymentsByOrderService).toHaveBeenCalledWith('o1', 'tenantA', 'u1', { session: {} });
            expect(mockAuditAction).toHaveBeenCalled();
        });

        it('cancels order even if product was hard deleted (skips restore)', async () => {
            mockGetOrderByIdRepo.mockResolvedValue({
                _id: 'o1',
                status: 'paid',
                items: [{ productId: 'p1', quantity: 2 }],
            });
            mockIncrementProductStock.mockResolvedValue(null);
            mockCancelPaymentsByOrderService.mockResolvedValue({ modifiedCount: 1 });
            mockUpdateOrderRepo.mockResolvedValue({ _id: 'o1', status: 'canceled' });

            const result = await cancelOrderService('o1', { cancelReason: 'Produto removido' }, 'tenantA', 'u1');

            expect(result.status).toBe('canceled');
            expect(mockAuditAction).toHaveBeenCalledWith('orderItem', 'cancel_restore_skipped', expect.anything(), null, 'u1', { session: {} });
        });

        it('rejects canceling an already canceled order', async () => {
            mockGetOrderByIdRepo.mockResolvedValue({ _id: 'o1', status: 'canceled' });

            await expect(cancelOrderService('o1', {}, 'tenantA', 'u1')).rejects.toMatchObject({ statusCode: 409 });
        });

        it('rejects cancellation by non-admin after the 30-minute window', async () => {
            mockGetOrderByIdRepo.mockResolvedValue({
                _id: 'o1',
                status: 'paid',
                items: [],
                createdAt: new Date(Date.now() - 31 * 60 * 1000),
            });

            await expect(
                cancelOrderService('o1', {}, 'tenantA', 'u1', 'user')
            ).rejects.toMatchObject({ statusCode: 409 });
        });

        it('allows admin to cancel after the 30-minute window', async () => {
            mockGetOrderByIdRepo.mockResolvedValue({
                _id: 'o1',
                status: 'paid',
                items: [],
                createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
            });
            mockCancelPaymentsByOrderService.mockResolvedValue({ modifiedCount: 1 });
            mockUpdateOrderRepo.mockResolvedValue({ _id: 'o1', status: 'canceled' });

            const result = await cancelOrderService('o1', {}, 'tenantA', 'u1', 'admin');

            expect(result.status).toBe('canceled');
        });
    });
});
