import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    createPermissionPresetService,
    getPermissionPresetsService,
    getPermissionPresetByIdService,
    updatePermissionPresetService,
    softDeletePermissionPresetService,
    restorePermissionPresetService,
} from '../permissionPresetService.js';

const mockCreateRepo = vi.fn();
const mockGetByIdRepo = vi.fn();
const mockGetListRepo = vi.fn();
const mockCountRepo = vi.fn();
const mockUpdateRepo = vi.fn();
const mockSoftDeleteRepo = vi.fn();
const mockRestoreRepo = vi.fn();
const mockAuditAction = vi.fn();

vi.mock('../permissionPresetRepo.js', () => ({
    createPermissionPresetRepo: (...args) => mockCreateRepo(...args),
    getPermissionPresetByIdRepo: (...args) => mockGetByIdRepo(...args),
    getPermissionPresetsRepo: (...args) => mockGetListRepo(...args),
    countPermissionPresetsRepo: (...args) => mockCountRepo(...args),
    updatePermissionPresetRepo: (...args) => mockUpdateRepo(...args),
    softDeletePermissionPresetRepo: (...args) => mockSoftDeleteRepo(...args),
    restorePermissionPresetRepo: (...args) => mockRestoreRepo(...args),
}));

vi.mock('../../audit/auditHelpers.js', () => ({
    auditAction: (...args) => mockAuditAction(...args),
    toPlain: (doc) => doc,
}));

const masterActor = { id: 'm1', role: 'master', tenantId: null };
const adminActor = { id: 'a1', role: 'admin', tenantId: 'tenantA' };

describe('permissionPresetService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createPermissionPresetService', () => {
        it('creates a global preset for master', async () => {
            mockCreateRepo.mockResolvedValue({ _id: 'p1', name: 'Estoquista', permissions: ['products:read'] });

            const result = await createPermissionPresetService(
                { name: 'Estoquista', permissions: ['products:read'] },
                masterActor
            );

            expect(result._id).toBe('p1');
            expect(mockCreateRepo).toHaveBeenCalledWith(expect.objectContaining({ tenantId: null }));
            expect(mockAuditAction).toHaveBeenCalled();
        });

        it('forces tenantId to actor tenant for admin', async () => {
            mockCreateRepo.mockResolvedValue({ _id: 'p2' });

            await createPermissionPresetService(
                { name: 'Vendedor', permissions: ['orders:write'] },
                adminActor
            );

            expect(mockCreateRepo).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'tenantA' }));
        });

        it('rejects invalid permissions', async () => {
            await expect(
                createPermissionPresetService(
                    { name: 'Invalido', permissions: ['foo:bar'] },
                    adminActor
                )
            ).rejects.toMatchObject({ statusCode: 400 });

            expect(mockCreateRepo).not.toHaveBeenCalled();
        });

        it('rejects empty permissions array', async () => {
            await expect(
                createPermissionPresetService(
                    { name: 'Vazio', permissions: [] },
                    adminActor
                )
            ).rejects.toMatchObject({ statusCode: 400 });
        });
    });

    describe('getPermissionPresetsService', () => {
        it('lists global and tenant presets for admin', async () => {
            mockGetListRepo.mockResolvedValue([{ _id: 'p1' }]);
            mockCountRepo.mockResolvedValue(1);

            const result = await getPermissionPresetsService({}, adminActor);

            expect(result.data).toHaveLength(1);
            expect(result.pagination.total).toBe(1);
            expect(mockGetListRepo).toHaveBeenCalledWith(
                expect.objectContaining({
                    $or: [{ tenantId: 'tenantA' }, { tenantId: null }],
                    deletedAt: null,
                }),
                expect.any(Number),
                expect.any(Number),
                expect.any(Object)
            );
        });

        it('lists all presets for master including deleted when requested', async () => {
            mockGetListRepo.mockResolvedValue([{ _id: 'p1' }, { _id: 'p2' }]);
            mockCountRepo.mockResolvedValue(2);

            const result = await getPermissionPresetsService({ includeDeleted: 'true' }, masterActor);

            expect(result.data).toHaveLength(2);
            const filter = mockGetListRepo.mock.calls[0][0];
            expect(filter.deletedAt).toBeUndefined();
            expect(filter.$or).toBeUndefined();
        });
    });

    describe('getPermissionPresetByIdService', () => {
        it('returns preset accessible to admin tenant', async () => {
            mockGetByIdRepo.mockResolvedValue({ _id: 'p1', tenantId: { toString: () => 'tenantA' } });

            const result = await getPermissionPresetByIdService('p1', adminActor);

            expect(result._id).toBe('p1');
        });

        it('blocks admin from accessing preset of another tenant', async () => {
            mockGetByIdRepo.mockResolvedValue({ _id: 'p1', tenantId: { toString: () => 'tenantB' } });

            await expect(getPermissionPresetByIdService('p1', adminActor)).rejects.toMatchObject({ statusCode: 403 });
        });

        it('allows master to access any preset', async () => {
            mockGetByIdRepo.mockResolvedValue({ _id: 'p1', tenantId: { toString: () => 'tenantB' } });

            const result = await getPermissionPresetByIdService('p1', masterActor);

            expect(result._id).toBe('p1');
        });

        it('throws 404 when preset not found', async () => {
            mockGetByIdRepo.mockResolvedValue(null);

            await expect(getPermissionPresetByIdService('p1', adminActor)).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('updatePermissionPresetService', () => {
        it('updates name and permissions and audits', async () => {
            const previous = { _id: 'p1', name: 'Old', permissions: ['products:read'] };
            const updated = { _id: 'p1', name: 'New', permissions: ['products:read', 'products:write'] };
            mockGetByIdRepo.mockResolvedValue(previous);
            mockUpdateRepo.mockResolvedValue(updated);

            const result = await updatePermissionPresetService('p1', { name: 'New', permissions: ['products:read', 'products:write'] }, adminActor);

            expect(result.name).toBe('New');
            expect(mockUpdateRepo).toHaveBeenCalledWith('p1', { name: 'New', permissions: ['products:read', 'products:write'] }, null);
            expect(mockAuditAction).toHaveBeenCalled();
        });

        it('rejects update with empty permissions', async () => {
            mockGetByIdRepo.mockResolvedValue({ _id: 'p1' });

            await expect(updatePermissionPresetService('p1', { permissions: [] }, adminActor)).rejects.toMatchObject({ statusCode: 400 });
        });

        it('throws when no valid fields provided', async () => {
            mockGetByIdRepo.mockResolvedValue({ _id: 'p1' });

            await expect(updatePermissionPresetService('p1', {}, adminActor)).rejects.toMatchObject({ statusCode: 400 });
        });
    });

    describe('softDeletePermissionPresetService', () => {
        it('performs soft delete and audits', async () => {
            const previous = { _id: 'p1', deletedAt: null };
            mockGetByIdRepo.mockResolvedValue(previous);
            mockSoftDeleteRepo.mockResolvedValue({ _id: 'p1', deletedAt: expect.any(Date) });

            await softDeletePermissionPresetService('p1', adminActor);

            expect(mockSoftDeleteRepo).toHaveBeenCalledWith('p1', null);
            expect(mockAuditAction).toHaveBeenCalled();
        });
    });

    describe('restorePermissionPresetService', () => {
        it('restores a soft-deleted preset', async () => {
            mockGetByIdRepo.mockResolvedValue({ _id: 'p1', deletedAt: new Date() });
            mockRestoreRepo.mockResolvedValue({ _id: 'p1', deletedAt: null });

            const result = await restorePermissionPresetService('p1', adminActor);

            expect(result.deletedAt).toBeNull();
            expect(mockAuditAction).toHaveBeenCalled();
        });
    });
});
