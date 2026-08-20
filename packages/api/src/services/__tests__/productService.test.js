import { describe, it, expect, vi } from 'vitest';
import { createProductService } from '../productService.js';

const mockCreateProductRepo = vi.fn();

vi.mock('../../repositories/productRepo.js', () => ({
    createProductRepo: (...args) => mockCreateProductRepo(...args),
    getProductsRepo: vi.fn(),
    countProductsRepo: vi.fn(),
    baseQuery: vi.fn(() => ({})),
    getProductByIdRepo: vi.fn(),
    updateProductRepo: vi.fn(),
    softDeleteProductRepo: vi.fn(),
    hardDeleteProductRepo: vi.fn(),
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

            const expectedData = {
                name: 'Notebook',
                price: 5000,
                costPrice: 3500,
                quantityInStock: 10,
                category: 'eletronico',
                tenantId: '64abc',
            };

            mockCreateProductRepo.mockResolvedValue({ _id: '123', ...expectedData });

            const result = await createProductService(data, tenantId);

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
            }, '64abc')).rejects.toThrow('Campos obrigatórios faltando');
        });

        it('throws error when price is negative', async () => {
            await expect(createProductService({
                name: 'Notebook',
                price: '-10',
                costPrice: '3500',
                quantityInStock: '10',
                category: 'eletronico',
            }, '64abc')).rejects.toThrow('deve ser um número positivo');
        });
    });
});
