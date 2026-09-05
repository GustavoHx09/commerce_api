import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCustomerService, getCustomersService, updateCustomerService } from '../customerService.js';

const mockCreateRepo = vi.fn();
const mockGetByIdRepo = vi.fn();
const mockGetListRepo = vi.fn();
const mockCountRepo = vi.fn();
const mockUpdateRepo = vi.fn();
const mockSoftDeleteRepo = vi.fn();
const mockRestoreRepo = vi.fn();
const mockHardDeleteRepo = vi.fn();
const mockAuditAction = vi.fn();

vi.mock('../customerRepo.js', () => ({
    createCustomerRepo: (...args) => mockCreateRepo(...args),
    getCustomerByIdRepo: (...args) => mockGetByIdRepo(...args),
    getCustomersRepo: (...args) => mockGetListRepo(...args),
    countCustomersRepo: (...args) => mockCountRepo(...args),
    updateCustomerRepo: (...args) => mockUpdateRepo(...args),
    softDeleteCustomerRepo: (...args) => mockSoftDeleteRepo(...args),
    restoreCustomerRepo: (...args) => mockRestoreRepo(...args),
    hardDeleteCustomerRepo: (...args) => mockHardDeleteRepo(...args),
}));

vi.mock('../../audit/auditHelpers.js', () => ({
    auditAction: (...args) => mockAuditAction(...args),
    toPlain: (doc) => doc,
}));

describe('customerService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetListRepo.mockResolvedValue([]);
    });

    describe('createCustomerService', () => {
        it('creates customer with valid CPF', async () => {
            mockCreateRepo.mockResolvedValue({ _id: 'c1', name: 'João' });

            const result = await createCustomerService({
                name: 'João',
                document: '529.982.247-25',
                documentType: 'cpf',
                phone: '11999999999',
            }, 'tenantA', 'u1');

            expect(result._id).toBe('c1');
            expect(mockCreateRepo).toHaveBeenCalledWith(expect.objectContaining({
                tenantId: 'tenantA',
                name: 'João',
                document: '52998224725',
                documentType: 'cpf',
            }));
            expect(mockAuditAction).toHaveBeenCalled();
        });

        it('rejects invalid CPF', async () => {
            await expect(createCustomerService({
                name: 'João',
                document: '111.111.111-11',
                documentType: 'cpf',
            }, 'tenantA', 'u1')).rejects.toMatchObject({ statusCode: 400 });
        });

        it('rejects duplicate document', async () => {
            mockGetListRepo.mockResolvedValue([{ _id: 'existing' }]);

            await expect(createCustomerService({
                name: 'João',
                document: '529.982.247-25',
                documentType: 'cpf',
            }, 'tenantA', 'u1')).rejects.toMatchObject({ statusCode: 409 });
        });
    });

    describe('getCustomersService', () => {
        it('lists customers with pagination', async () => {
            mockGetListRepo.mockResolvedValue([{ _id: 'c1' }]);
            mockCountRepo.mockResolvedValue(1);

            const result = await getCustomersService({}, 'tenantA');

            expect(result.data).toHaveLength(1);
            expect(mockGetListRepo).toHaveBeenCalledWith(
                expect.objectContaining({ tenantId: 'tenantA', deletedAt: null }),
                expect.any(Number),
                expect.any(Number),
                expect.any(Object)
            );
        });
    });

    describe('updateCustomerService', () => {
        it('updates customer name', async () => {
            mockGetByIdRepo.mockResolvedValue({ _id: 'c1', document: '52998224725', documentType: 'cpf' });
            mockUpdateRepo.mockResolvedValue({ _id: 'c1', name: 'João Silva' });

            const result = await updateCustomerService('c1', { name: 'João Silva' }, 'tenantA', 'u1');

            expect(result.name).toBe('João Silva');
            expect(mockAuditAction).toHaveBeenCalled();
        });

        it('throws 404 when customer not found', async () => {
            mockGetByIdRepo.mockResolvedValue(null);

            await expect(updateCustomerService('c1', { name: 'João' }, 'tenantA', 'u1')).rejects.toMatchObject({ statusCode: 404 });
        });
    });
});
