import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    createCategoryService,
    getCategoriesService,
    updateCategoryService,
    softDeleteCategoryService,
    restoreCategoryService,
} from '../categoryService.js';

const mockCreateRepo = vi.fn();
const mockGetByIdRepo = vi.fn();
const mockGetListRepo = vi.fn();
const mockCountRepo = vi.fn();
const mockUpdateRepo = vi.fn();
const mockSoftDeleteRepo = vi.fn();
const mockRestoreRepo = vi.fn();
const mockHardDeleteRepo = vi.fn();
const mockProductCount = vi.fn();
const mockAuditAction = vi.fn();

vi.mock('../categoryRepo.js', () => ({
    createCategoryRepo: (...args) => mockCreateRepo(...args),
    getCategoryByIdRepo: (...args) => mockGetByIdRepo(...args),
    getCategoriesRepo: (...args) => mockGetListRepo(...args),
    countCategoriesRepo: (...args) => mockCountRepo(...args),
    updateCategoryRepo: (...args) => mockUpdateRepo(...args),
    softDeleteCategoryRepo: (...args) => mockSoftDeleteRepo(...args),
    restoreCategoryRepo: (...args) => mockRestoreRepo(...args),
    hardDeleteCategoryRepo: (...args) => mockHardDeleteRepo(...args),
}));

vi.mock('../../audit/auditHelpers.js', () => ({
    auditAction: (...args) => mockAuditAction(...args),
    toPlain: (doc) => doc,
}));

vi.mock('../../product/productModel.js', () => ({
    default: {
        countDocuments: (...args) => mockProductCount(...args),
    },
}));

describe('categoryService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createCategoryService', () => {
        it('creates category with tenant and audits', async () => {
            mockCreateRepo.mockResolvedValue({ _id: 'c1', name: 'Bebidas' });

            const result = await createCategoryService({ name: 'Bebidas' }, 'tenantA', 'u1');

            expect(result._id).toBe('c1');
            expect(mockCreateRepo).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'tenantA', name: 'Bebidas' }));
            expect(mockAuditAction).toHaveBeenCalled();
        });

        it('rejects empty name', async () => {
            await expect(createCategoryService({ name: '   ' }, 'tenantA', 'u1')).rejects.toMatchObject({ statusCode: 400 });
            expect(mockCreateRepo).not.toHaveBeenCalled();
        });
    });

    describe('getCategoriesService', () => {
        it('lists categories with pagination', async () => {
            mockGetListRepo.mockResolvedValue([{ _id: 'c1' }]);
            mockCountRepo.mockResolvedValue(1);

            const result = await getCategoriesService({ page: '1', limit: '10' }, 'tenantA');

            expect(result.data).toHaveLength(1);
            expect(result.pagination.total).toBe(1);
            expect(mockGetListRepo).toHaveBeenCalledWith(
                expect.objectContaining({ tenantId: 'tenantA', deletedAt: null }),
                expect.any(Number),
                expect.any(Number),
                expect.any(Object)
            );
        });
    });

    describe('updateCategoryService', () => {
        it('updates name and description', async () => {
            mockGetByIdRepo.mockResolvedValue({ _id: 'c1', name: 'Old' });
            mockUpdateRepo.mockResolvedValue({ _id: 'c1', name: 'New' });

            const result = await updateCategoryService('c1', { name: 'New', description: 'Desc' }, 'tenantA', 'u1');

            expect(result.name).toBe('New');
            expect(mockUpdateRepo).toHaveBeenCalledWith('c1', { name: 'New', description: 'Desc' }, 'tenantA');
            expect(mockAuditAction).toHaveBeenCalled();
        });

        it('throws 404 when category not found', async () => {
            mockGetByIdRepo.mockResolvedValue(null);

            await expect(updateCategoryService('c1', { name: 'New' }, 'tenantA', 'u1')).rejects.toMatchObject({ statusCode: 404 });
        });

        it('rejects update with no valid fields', async () => {
            mockGetByIdRepo.mockResolvedValue({ _id: 'c1' });

            await expect(updateCategoryService('c1', {}, 'tenantA', 'u1')).rejects.toMatchObject({ statusCode: 400 });
        });
    });

    describe('softDeleteCategoryService', () => {
        it('deletes category without products and audits', async () => {
            mockGetByIdRepo.mockResolvedValue({ _id: 'c1' });
            mockProductCount.mockResolvedValue(0);
            mockSoftDeleteRepo.mockResolvedValue({ _id: 'c1', deletedAt: new Date() });

            await softDeleteCategoryService('c1', 'tenantA', 'u1');

            expect(mockProductCount).toHaveBeenCalledWith({ categoryId: 'c1', tenantId: 'tenantA', deletedAt: null });
            expect(mockSoftDeleteRepo).toHaveBeenCalledWith('c1', 'tenantA');
            expect(mockAuditAction).toHaveBeenCalled();
        });

        it('blocks deletion when category has active products', async () => {
            mockGetByIdRepo.mockResolvedValue({ _id: 'c1' });
            mockProductCount.mockResolvedValue(2);

            await expect(softDeleteCategoryService('c1', 'tenantA', 'u1')).rejects.toMatchObject({ statusCode: 409 });
            expect(mockSoftDeleteRepo).not.toHaveBeenCalled();
        });
    });

    describe('restoreCategoryService', () => {
        it('restores a soft-deleted category', async () => {
            mockGetByIdRepo.mockResolvedValue({ _id: 'c1', deletedAt: new Date() });
            mockRestoreRepo.mockResolvedValue({ _id: 'c1', deletedAt: null });

            const result = await restoreCategoryService('c1', 'tenantA', 'u1');

            expect(result.deletedAt).toBeNull();
            expect(mockAuditAction).toHaveBeenCalled();
        });

        it('rejects restoring active category', async () => {
            mockGetByIdRepo.mockResolvedValue({ _id: 'c1', deletedAt: null });

            await expect(restoreCategoryService('c1', 'tenantA', 'u1')).rejects.toMatchObject({ statusCode: 400 });
        });
    });
});
