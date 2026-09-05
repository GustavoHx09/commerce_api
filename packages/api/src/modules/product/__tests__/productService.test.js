import { describe, it, expect, vi } from 'vitest';
import { createProductService } from '../productService.js';

const mockCreateProductRepo = vi.fn();
const mockAuditAction = vi.fn();

vi.mock('.././productRepo.js', () => ({
    createProductRepo: (...args) => mockCreateProductRepo(...args),
    getProductsRepo: vi.fn(),
    countProductsRepo: vi.fn(),
    baseQuery: vi.fn(() => ({})),
    getProductByIdRepo: vi.fn(),
    updateProductRepo: vi.fn(),
    softDeleteProductRepo: vi.fn(),
    hardDeleteProductRepo: vi.fn(),
}));

vi.mock('../../audit/auditHelpers.js', () => ({
    auditAction: (...args) => mockAuditAction(...args),
    toPlain: (doc) => doc,
}));

describe('productService', () => {
    describe('createProductService', () => {
        it('creates a product with valid data', async () => {
            const data = {
                name: 'Notebook',
                price: '5000',
                costPrice: '3500',
                quantityInStock: '10',
                category: 'eletronico',
            };
            const tenantId = '64abc';
            const actorId = '64def';

            const expectedData = {
                name: 'Notebook',
                price: 5000,
                costPrice: 3500,
                quantityInStock: 10,
                category: 'eletronico',
                tenantId: '64abc',
            };

            mockCreateProductRepo.mockResolvedValue({ _id: '123', ...expectedData });
            mockAuditAction.mockResolvedValue({});

            const result = await createProductService(data, tenantId, actorId);

            expect(result).toEqual({ _id: '123', ...expectedData });
            expect(mockCreateProductRepo).toHaveBeenCalledWith({
                name: 'Notebook',
                price: 5000,
                costPrice: 3500,
                quantityInStock: 10,
                category: 'eletronico',
                tenantId: '64abc',
            });
        });

        it('throws error when name is missing', async () => {
            await expect(createProductService({
                price: '5000',
                costPrice: '3500',
                quantityInStock: '10',
                category: 'eletronico',
            }, '64abc', '64def')).rejects.toThrow('Campos obrigatórios faltando');
        });

        it('throws error when price is negative', async () => {
            await expect(createProductService({
                name: 'Notebook',
                price: '-10',
                costPrice: '3500',
                quantityInStock: '10',
                category: 'eletronico',
            }, '64abc', '64def')).rejects.toThrow('deve ser um número positivo');
        });
    });
});
