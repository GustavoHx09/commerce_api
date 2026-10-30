import { describe, it, expect, vi, beforeEach } from 'vitest';
import { importResourceService } from '../importService.js';

const mockCreateProduct = vi.fn();
const mockCreateCategory = vi.fn();
const mockCreateCustomer = vi.fn();
const mockCreateSupplier = vi.fn();
const mockCreateMovement = vi.fn();
const mockGetCategories = vi.fn();
const mockHasPermission = vi.fn();

vi.mock('../../product/productService.js', () => ({
    createProductService: (...args) => mockCreateProduct(...args),
}));
vi.mock('../../category/categoryService.js', () => ({
    createCategoryService: (...args) => mockCreateCategory(...args),
}));
vi.mock('../../customer/customerService.js', () => ({
    createCustomerService: (...args) => mockCreateCustomer(...args),
}));
vi.mock('../../supplier/supplierService.js', () => ({
    createSupplierService: (...args) => mockCreateSupplier(...args),
}));
vi.mock('../../stock/stockMovementService.js', () => ({
    createStockMovementService: (...args) => mockCreateMovement(...args),
}));
vi.mock('../../category/categoryRepo.js', () => ({
    getCategoriesRepo: (...args) => mockGetCategories(...args),
}));
vi.mock('../../../shared/utils/permissionHelpers.js', () => ({
    hasPermission: (...args) => mockHasPermission(...args),
}));

const actor = { id: 'u1', role: 'admin' };
const csv = (lines) => Buffer.from(lines.join('\n'), 'utf8');
const PRODUCTS_HEADER = 'name,sku,unit,price,costPrice,minStock,quantityInStock,category,isActive';

describe('importService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockHasPermission.mockReturnValue(true);
        mockGetCategories.mockResolvedValue([{ _id: 'cat1', name: 'Bebidas' }]);
        mockCreateProduct.mockResolvedValue({ _id: 'p1', sku: 'REF-1' });
        mockCreateCategory.mockResolvedValue({ _id: 'cat2', name: 'Nova' });
    });

    it('rejects invalid resource', async () => {
        await expect(
            importResourceService('orders', csv(['a,b', '1,2']), 'file.csv', 'tenantA', actor)
        ).rejects.toThrow('Recurso inválido');
    });

    it('rejects CSV without data rows', async () => {
        await expect(
            importResourceService('categories', csv(['name']), 'file.csv', 'tenantA', actor)
        ).rejects.toThrow('sem linhas de dados');
    });

    it('imports categories from CSV', async () => {
        const result = await importResourceService(
            'categories',
            csv(['name,description,isActive', 'Limpeza,Produtos de limpeza,true']),
            'file.csv',
            'tenantA',
            actor
        );

        expect(result.created).toBe(1);
        expect(mockCreateCategory).toHaveBeenCalledWith(
            { name: 'Limpeza', description: 'Produtos de limpeza', isActive: true },
            'tenantA',
            'u1'
        );
    });

    it('keeps importing valid rows and reports errors per line', async () => {
        mockCreateCustomer
            .mockRejectedValueOnce(new Error('Documento já cadastrado para este cliente'))
            .mockResolvedValueOnce({ _id: 'c1' });

        const result = await importResourceService(
            'customers',
            csv(['name,document,documentType', 'A,111,cpf', 'B,222,cpf']),
            'file.csv',
            'tenantA',
            actor
        );

        expect(result.total).toBe(2);
        expect(result.created).toBe(1);
        expect(result.errors).toEqual([
            { line: 2, message: 'Documento já cadastrado para este cliente' },
        ]);
    });

    it('resolves product category by name', async () => {
        await importResourceService(
            'products',
            csv([PRODUCTS_HEADER, 'Refri,REF-1,lt,10,5,2,,Bebidas,true']),
            'file.csv',
            'tenantA',
            actor
        );

        expect(mockCreateProduct).toHaveBeenCalledWith(
            expect.objectContaining({ categoryId: 'cat1' }),
            'tenantA',
            'u1'
        );
    });

    it('auto-creates missing category before the product', async () => {
        await importResourceService(
            'products',
            csv([PRODUCTS_HEADER, 'Suco,SC-1,lt,8,4,1,,Nova,true']),
            'file.csv',
            'tenantA',
            actor
        );

        expect(mockCreateCategory).toHaveBeenCalledWith({ name: 'Nova' }, 'tenantA', 'u1');
        expect(mockCreateProduct).toHaveBeenCalledWith(
            expect.objectContaining({ categoryId: 'cat2' }),
            'tenantA',
            'u1'
        );
    });

    it('creates audited stock movement for initial stock', async () => {
        await importResourceService(
            'products',
            csv([PRODUCTS_HEADER, 'Refri,REF-1,lt,10,5,2,15,Bebidas,true']),
            'file.csv',
            'tenantA',
            actor
        );

        expect(mockCreateMovement).toHaveBeenCalledWith(
            {
                productId: 'p1',
                type: 'in',
                quantity: 15,
                reason: 'Importação de produtos',
                reference: 'REF-1',
            },
            'tenantA',
            actor
        );
    });

    it('rejects initial stock import without supply permission', async () => {
        mockHasPermission.mockReturnValue(false);

        await expect(
            importResourceService(
                'products',
                csv([PRODUCTS_HEADER, 'Refri,REF-1,lt,10,5,2,15,Bebidas,true']),
                'file.csv',
                'tenantA',
                actor
            )
        ).rejects.toThrow('suprimento de estoque');
        expect(mockCreateProduct).not.toHaveBeenCalled();
    });

    it('imports products from JSON like the export format', async () => {
        const json = Buffer.from(
            JSON.stringify([{ name: 'Refri', sku: 'REF-1', unit: 'lt', price: 10, costPrice: 5, minStock: 2, category: 'Bebidas', isActive: true }]),
            'utf8'
        );

        const result = await importResourceService('products', json, 'products.json', 'tenantA', actor);

        expect(result.created).toBe(1);
        expect(mockCreateProduct).toHaveBeenCalledWith(
            expect.objectContaining({ sku: 'REF-1', price: 10, categoryId: 'cat1' }),
            'tenantA',
            'u1'
        );
    });

    it('parses quoted CSV fields containing commas', async () => {
        await importResourceService(
            'categories',
            csv(['name,description', '"Limpeza, higiene e perfumaria",Desc']),
            'file.csv',
            'tenantA',
            actor
        );

        expect(mockCreateCategory).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'Limpeza, higiene e perfumaria' }),
            'tenantA',
            'u1'
        );
    });
});
