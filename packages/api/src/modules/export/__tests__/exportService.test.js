import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportResourceService } from '../exportService.js';

const mockGetExportData = vi.fn();
const mockCountExportData = vi.fn();

vi.mock('../exportRepo.js', () => ({
    getExportData: (...args) => mockGetExportData(...args),
    countExportData: (...args) => mockCountExportData(...args),
}));

describe('exportService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('rejects invalid resource', async () => {
        await expect(exportResourceService('invalid', {}, 'tenantA')).rejects.toThrow('Recurso inválido');
    });

    it('rejects invalid format', async () => {
        await expect(exportResourceService('products', { format: 'xml' }, 'tenantA')).rejects.toThrow('Formato inválido');
    });

    it('exports products as CSV', async () => {
        mockGetExportData.mockResolvedValue([{ name: 'Produto A', sku: 'P1', unit: 'un', price: 10, costPrice: 5, quantityInStock: 5, minStock: 1, categoryId: { name: 'Categoria' }, isActive: true, createdAt: new Date('2026-09-06') }]);
        mockCountExportData.mockResolvedValue(1);

        const result = await exportResourceService('products', {}, 'tenantA');

        expect(result.contentType).toBe('text/csv; charset=utf-8');
        expect(result.filename).toMatch(/products_page_1\.csv$/);
        expect(result.total).toBe(1);
        expect(result.content).toContain('Produto A,P1,un,10,5,5,1,Categoria,true');
    });

    it('escapes commas and quotes in CSV', async () => {
        mockGetExportData.mockResolvedValue([{ name: 'Produto, com vírgula', sku: 'P2', unit: 'un', price: 10, costPrice: null, quantityInStock: 1, minStock: 0, categoryId: null, isActive: true, createdAt: new Date('2026-09-06') }]);
        mockCountExportData.mockResolvedValue(1);

        const result = await exportResourceService('products', { format: 'csv' }, 'tenantA');

        expect(result.content).toContain('"Produto, com vírgula"');
    });

    it('exports customers with flattened address', async () => {
        mockGetExportData.mockResolvedValue([{
            name: 'Cliente',
            document: '123',
            documentType: 'cpf',
            phone: '',
            email: '',
            address: { street: 'Rua A', number: '10', city: 'São Paulo', state: 'SP' },
            isActive: true,
            createdAt: new Date('2026-09-06'),
        }]);
        mockCountExportData.mockResolvedValue(1);

        const result = await exportResourceService('customers', { format: 'csv' }, 'tenantA');

        expect(result.content).toContain('Rua A,10,,,São Paulo,SP,');
    });

    it('exports orders CSV flattened by item', async () => {
        mockGetExportData.mockResolvedValue([{
            _id: 'o1',
            createdAt: new Date('2026-09-06'),
            customerId: { name: 'Cliente' },
            cashierId: { _id: 'c1' },
            status: 'paid',
            total: 150,
            paymentIds: [{ method: 'cash' }],
            items: [
                { productId: 'p1', name: 'Item 1', sku: 'I1', unit: 'un', quantity: 2, unitPrice: 50, discount: 0, total: 100 },
                { productId: 'p2', name: 'Item 2', sku: 'I2', unit: 'un', quantity: 1, unitPrice: 50, discount: 0, total: 50 },
            ],
        }]);
        mockCountExportData.mockResolvedValue(1);

        const result = await exportResourceService('orders', { format: 'csv' }, 'tenantA');

        const lines = result.content.trim().split('\n');
        expect(lines).toHaveLength(3); // header + 2 items
        expect(result.content).toContain('Item 1');
        expect(result.content).toContain('Item 2');
    });

    it('exports products as JSON', async () => {
        const product = { name: 'Produto A', sku: 'P1', unit: 'un', price: 10, costPrice: null, quantityInStock: 5, minStock: 1, categoryId: { name: 'Categoria' }, isActive: true, createdAt: new Date('2026-09-06') };
        mockGetExportData.mockResolvedValue([product]);
        mockCountExportData.mockResolvedValue(1);

        const result = await exportResourceService('products', { format: 'json' }, 'tenantA');

        expect(result.contentType).toBe('application/json; charset=utf-8');
        expect(result.filename).toMatch(/products_page_1\.json$/);
        expect(JSON.parse(result.content)[0].name).toBe('Produto A');
    });

    it('applies pagination parameters', async () => {
        mockGetExportData.mockResolvedValue([]);
        mockCountExportData.mockResolvedValue(0);

        await exportResourceService('categories', { page: '2', limit: '50' }, 'tenantA');

        expect(mockGetExportData).toHaveBeenCalledWith('categories', 'tenantA', 50, 50, expect.any(Object));
    });
});
