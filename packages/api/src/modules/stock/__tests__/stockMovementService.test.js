import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStockMovementService, getStockMovementsService } from '../stockMovementService.js';

const mockCreateRepo = vi.fn();
const mockGetByIdRepo = vi.fn();
const mockGetListRepo = vi.fn();
const mockCountRepo = vi.fn();
const mockGetProductByIdRepo = vi.fn();
const mockUpdateProductRepo = vi.fn();
const mockAuditAction = vi.fn();

vi.mock('../stockMovementRepo.js', () => ({
    createStockMovementRepo: (...args) => mockCreateRepo(...args),
    getStockMovementByIdRepo: (...args) => mockGetByIdRepo(...args),
    getStockMovementsRepo: (...args) => mockGetListRepo(...args),
    countStockMovementsRepo: (...args) => mockCountRepo(...args),
}));

vi.mock('../../product/productRepo.js', () => ({
    getProductByIdRepo: (...args) => mockGetProductByIdRepo(...args),
    updateProductRepo: (...args) => mockUpdateProductRepo(...args),
}));

vi.mock('../../audit/auditHelpers.js', () => ({
    auditAction: (...args) => mockAuditAction(...args),
    toPlain: (doc) => doc,
}));

describe('stockMovementService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createStockMovementService', () => {
        it('registers an incoming movement and updates stock', async () => {
            mockGetProductByIdRepo.mockResolvedValue({ _id: 'p1', quantityInStock: 5 });
            mockUpdateProductRepo.mockResolvedValue({});
            mockCreateRepo.mockResolvedValue({ _id: 'm1', newQuantity: 15 });

            const result = await createStockMovementService(
                { productId: 'p1', type: 'in', quantity: '10', reason: 'Compra' },
                'tenantA',
                'u1'
            );

            expect(result.newQuantity).toBe(15);
            expect(mockUpdateProductRepo).toHaveBeenCalledWith('p1', { quantityInStock: 15 }, 'tenantA');
            expect(mockCreateRepo).toHaveBeenCalledWith(expect.objectContaining({ previousQuantity: 5, newQuantity: 15 }));
            expect(mockAuditAction).toHaveBeenCalled();
        });

        it('registers an outgoing movement and decreases stock', async () => {
            mockGetProductByIdRepo.mockResolvedValue({ _id: 'p1', quantityInStock: 10 });
            mockUpdateProductRepo.mockResolvedValue({});
            mockCreateRepo.mockResolvedValue({ _id: 'm2', newQuantity: 7 });

            const result = await createStockMovementService(
                { productId: 'p1', type: 'out', quantity: '3' },
                'tenantA',
                'u1'
            );

            expect(result.newQuantity).toBe(7);
            expect(mockUpdateProductRepo).toHaveBeenCalledWith('p1', { quantityInStock: 7 }, 'tenantA');
        });

        it('rejects out movement without enough stock', async () => {
            mockGetProductByIdRepo.mockResolvedValue({ _id: 'p1', quantityInStock: 2 });

            await expect(createStockMovementService(
                { productId: 'p1', type: 'out', quantity: '5' },
                'tenantA',
                'u1'
            )).rejects.toMatchObject({ statusCode: 409 });
        });

        it('registers an adjust movement as absolute quantity', async () => {
            mockGetProductByIdRepo.mockResolvedValue({ _id: 'p1', quantityInStock: 8 });
            mockUpdateProductRepo.mockResolvedValue({});
            mockCreateRepo.mockResolvedValue({ _id: 'm3', newQuantity: 20 });

            const result = await createStockMovementService(
                { productId: 'p1', type: 'adjust', quantity: '20' },
                'tenantA',
                'u1'
            );

            expect(result.newQuantity).toBe(20);
            expect(mockUpdateProductRepo).toHaveBeenCalledWith('p1', { quantityInStock: 20 }, 'tenantA');
        });

        it('throws 404 when product not found', async () => {
            mockGetProductByIdRepo.mockResolvedValue(null);

            await expect(createStockMovementService(
                { productId: 'p1', type: 'in', quantity: '5' },
                'tenantA',
                'u1'
            )).rejects.toMatchObject({ statusCode: 404 });
        });

        it('rejects invalid movement type', async () => {
            await expect(createStockMovementService(
                { productId: 'p1', type: 'invalid', quantity: '5' },
                'tenantA',
                'u1'
            )).rejects.toMatchObject({ statusCode: 400 });
        });
    });

    describe('getStockMovementsService', () => {
        it('lists movements with pagination', async () => {
            mockGetListRepo.mockResolvedValue([{ _id: 'm1' }]);
            mockCountRepo.mockResolvedValue(1);

            const result = await getStockMovementsService({ productId: 'p1' }, 'tenantA');

            expect(result.data).toHaveLength(1);
            expect(mockGetListRepo).toHaveBeenCalledWith(
                expect.objectContaining({ tenantId: 'tenantA', deletedAt: null, productId: 'p1' }),
                expect.any(Number),
                expect.any(Number),
                expect.any(Object)
            );
        });
    });
});
