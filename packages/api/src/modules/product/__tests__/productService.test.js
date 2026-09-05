import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createProductService, getProductsService, updateProductService } from '../productService.js';

const mockCreateProductRepo = vi.fn();
const mockGetProductsRepo = vi.fn();
const mockCountProductsRepo = vi.fn();
const mockGetProductByIdRepo = vi.fn();
const mockGetProductBySkuRepo = vi.fn();
const mockUpdateProductRepo = vi.fn();
const mockAuditAction = vi.fn();
const mockGetCategoryByIdRepo = vi.fn();

vi.mock('../productRepo.js', () => ({
    createProductRepo: (...args) => mockCreateProductRepo(...args),
    getProductsRepo: (...args) => mockGetProductsRepo(...args),
    countProductsRepo: (...args) => mockCountProductsRepo(...args),
    getProductByIdRepo: (...args) => mockGetProductByIdRepo(...args),
    getProductBySkuRepo: (...args) => mockGetProductBySkuRepo(...args),
    updateProductRepo: (...args) => mockUpdateProductRepo(...args),
    softDeleteProductRepo: vi.fn(),
    restoreProductRepo: vi.fn(),
    hardDeleteProductRepo: vi.fn(),
}));

vi.mock('../../category/categoryRepo.js', () => ({
    getCategoryByIdRepo: (...args) => mockGetCategoryByIdRepo(...args),
}));

vi.mock('../../audit/auditHelpers.js', () => ({
    auditAction: (...args) => mockAuditAction(...args),
    toPlain: (doc) => doc,
}));

describe('productService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetCategoryByIdRepo.mockResolvedValue({ _id: 'cat1' });
        mockGetProductBySkuRepo.mockResolvedValue(null);
    });

    describe('createProductService', () => {
        it('creates a product with valid data', async () => {
            const data = {
                name: 'Notebook',
                price: '5000',
                costPrice: '3500',
                quantityInStock: '10',
                minStock: '2',
                sku: 'NB-001',
                unit: 'UN',
                categoryId: 'cat1',
            };
            const tenantId = '64abc';
            const actorId = '64def';

            const expectedData = {
                name: 'Notebook',
                price: 5000,
                costPrice: 3500,
                quantityInStock: 10,
                minStock: 2,
                sku: 'NB-001',
                unit: 'un',
                categoryId: 'cat1',
                tenantId: '64abc',
            };

            mockCreateProductRepo.mockResolvedValue({ _id: '123', ...expectedData });
            mockAuditAction.mockResolvedValue({});

            const result = await createProductService(data, tenantId, actorId);

            expect(result).toEqual({ _id: '123', ...expectedData });
            expect(mockCreateProductRepo).toHaveBeenCalledWith(expectedData);
        });

        it('throws error when name is missing', async () => {
            await expect(createProductService({
                price: '5000',
                costPrice: '3500',
                quantityInStock: '10',
                sku: 'NB-001',
                unit: 'un',
                categoryId: 'cat1',
            }, '64abc', '64def')).rejects.toThrow('Campos obrigatórios faltando');
        });

        it('throws error when price is negative', async () => {
            await expect(createProductService({
                name: 'Notebook',
                price: '-10',
                costPrice: '3500',
                quantityInStock: '10',
                sku: 'NB-001',
                unit: 'un',
                categoryId: 'cat1',
            }, '64abc', '64def')).rejects.toThrow('deve ser um número positivo');
        });

        it('throws error when category not found', async () => {
            mockGetCategoryByIdRepo.mockResolvedValue(null);

            await expect(createProductService({
                name: 'Notebook',
                price: '5000',
                sku: 'NB-002',
                unit: 'un',
                categoryId: 'invalid',
            }, '64abc', '64def')).rejects.toThrow('Categoria não encontrada');
        });

        it('throws error when sku already exists', async () => {
            mockGetProductBySkuRepo.mockResolvedValue({ _id: 'other' });

            await expect(createProductService({
                name: 'Notebook',
                price: '5000',
                sku: 'NB-001',
                unit: 'un',
                categoryId: 'cat1',
            }, '64abc', '64def')).rejects.toThrow('SKU já cadastrado');
        });
    });

    describe('getProductsService', () => {
        it('lists products with low stock filter', async () => {
            mockGetProductsRepo.mockResolvedValue([{ _id: 'p1' }]);
            mockCountProductsRepo.mockResolvedValue(1);

            const result = await getProductsService({ minStockAlert: 'true' }, '64abc');

            expect(result.data).toHaveLength(1);
            expect(mockGetProductsRepo).toHaveBeenCalledWith(
                expect.objectContaining({
                    tenantId: '64abc',
                    deletedAt: null,
                    $expr: { $lte: ['$quantityInStock', '$minStock'] },
                }),
                expect.any(Number),
                expect.any(Number),
                expect.any(Object)
            );
        });
    });

    describe('updateProductService', () => {
        it('updates product name and price', async () => {
            mockGetProductByIdRepo.mockResolvedValue({ _id: 'p1', sku: 'NB-001' });
            mockUpdateProductRepo.mockResolvedValue({ _id: 'p1', name: 'Updated', price: 6000 });

            const result = await updateProductService('p1', { name: 'Updated', price: '6000' }, '64abc', 'u1');

            expect(result.name).toBe('Updated');
            expect(result.price).toBe(6000);
        });

        it('throws 404 when product not found', async () => {
            mockGetProductByIdRepo.mockResolvedValue(null);

            await expect(updateProductService('p1', { name: 'Updated' }, '64abc', 'u1')).rejects.toMatchObject({ statusCode: 404 });
        });
    });
});
