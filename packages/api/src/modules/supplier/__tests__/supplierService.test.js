import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupplierService, getSuppliersService, updateSupplierService } from '../supplierService.js';

const mockCreateRepo = vi.fn();
const mockGetByIdRepo = vi.fn();
const mockGetListRepo = vi.fn();
const mockCountRepo = vi.fn();
const mockUpdateRepo = vi.fn();
const mockSoftDeleteRepo = vi.fn();
const mockRestoreRepo = vi.fn();
const mockHardDeleteRepo = vi.fn();
const mockAuditAction = vi.fn();

vi.mock('../supplierRepo.js', () => ({
    createSupplierRepo: (...args) => mockCreateRepo(...args),
    getSupplierByIdRepo: (...args) => mockGetByIdRepo(...args),
    getSuppliersRepo: (...args) => mockGetListRepo(...args),
    countSuppliersRepo: (...args) => mockCountRepo(...args),
    updateSupplierRepo: (...args) => mockUpdateRepo(...args),
    softDeleteSupplierRepo: (...args) => mockSoftDeleteRepo(...args),
    restoreSupplierRepo: (...args) => mockRestoreRepo(...args),
    hardDeleteSupplierRepo: (...args) => mockHardDeleteRepo(...args),
}));

vi.mock('../../audit/auditHelpers.js', () => ({
    auditAction: (...args) => mockAuditAction(...args),
    toPlain: (doc) => doc,
}));

describe('supplierService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetListRepo.mockResolvedValue([]);
    });

    describe('createSupplierService', () => {
        it('creates supplier with valid CNPJ', async () => {
            mockCreateRepo.mockResolvedValue({ _id: 's1', name: 'Fornecedor' });

            const result = await createSupplierService({
                name: 'Fornecedor',
                document: '11.222.333/0001-81',
                documentType: 'cnpj',
                phone: '1133334444',
            }, 'tenantA', 'u1');

            expect(result._id).toBe('s1');
            expect(mockCreateRepo).toHaveBeenCalledWith(expect.objectContaining({
                tenantId: 'tenantA',
                name: 'Fornecedor',
                documentType: 'cnpj',
            }));
            expect(mockAuditAction).toHaveBeenCalled();
        });

        it('rejects invalid CNPJ', async () => {
            await expect(createSupplierService({
                name: 'Fornecedor',
                document: '11.111.111/1111-11',
                documentType: 'cnpj',
            }, 'tenantA', 'u1')).rejects.toMatchObject({ statusCode: 400 });
        });

        it('rejects duplicate document', async () => {
            mockGetListRepo.mockResolvedValue([{ _id: 'existing' }]);

            await expect(createSupplierService({
                name: 'Fornecedor',
                document: '11.222.333/0001-81',
                documentType: 'cnpj',
            }, 'tenantA', 'u1')).rejects.toMatchObject({ statusCode: 409 });
        });
    });

    describe('getSuppliersService', () => {
        it('lists suppliers with pagination', async () => {
            mockGetListRepo.mockResolvedValue([{ _id: 's1' }]);
            mockCountRepo.mockResolvedValue(1);

            const result = await getSuppliersService({}, 'tenantA');

            expect(result.data).toHaveLength(1);
            expect(mockGetListRepo).toHaveBeenCalledWith(
                expect.objectContaining({ tenantId: 'tenantA', deletedAt: null }),
                expect.any(Number),
                expect.any(Number),
                expect.any(Object)
            );
        });
    });

    describe('updateSupplierService', () => {
        it('updates supplier name', async () => {
            mockGetByIdRepo.mockResolvedValue({ _id: 's1', document: '11222333000181', documentType: 'cnpj' });
            mockUpdateRepo.mockResolvedValue({ _id: 's1', name: 'Updated' });

            const result = await updateSupplierService('s1', { name: 'Updated' }, 'tenantA', 'u1');

            expect(result.name).toBe('Updated');
            expect(mockAuditAction).toHaveBeenCalled();
        });

        it('throws 404 when supplier not found', async () => {
            mockGetByIdRepo.mockResolvedValue(null);

            await expect(updateSupplierService('s1', { name: 'Updated' }, 'tenantA', 'u1')).rejects.toMatchObject({ statusCode: 404 });
        });
    });
});
