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

// Evita depender de conexão Mongo: executa o callback com uma sessão fake.
const fakeSession = { id: 'session' };
vi.mock('../../../shared/utils/transactionHelpers.js', () => ({
    withTransaction: async (callback) => callback(fakeSession),
}));

// O helper de permissões importa o model de presets; aqui só precisamos do
// cálculo síncrono, então o model é substituído por um stub.
vi.mock('../../permissionPreset/permissionPresetModel.js', () => ({ default: {} }));

// Atores usados nos testes: admin (permissões padrão), funcionário comum e
// funcionário com stock:supply concedido manualmente.
const admin = { id: 'u1', role: 'admin' };
const employee = { id: 'u2', role: 'user' };
const supplier = { id: 'u3', role: 'user', permissions: ['stock:read', 'stock:supply'] };

describe('stockMovementService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createStockMovementService', () => {
        it('registers a supply (in) movement, updates stock and audits movement + product', async () => {
            const product = { _id: 'p1', quantityInStock: 5 };
            mockGetProductByIdRepo.mockResolvedValue(product);
            mockUpdateProductRepo.mockResolvedValue({ _id: 'p1', quantityInStock: 15 });
            mockCreateRepo.mockResolvedValue({ _id: 'm1', newQuantity: 15 });

            const result = await createStockMovementService(
                { productId: 'p1', type: 'in', quantity: '10', reason: 'Compra' },
                'tenantA',
                admin
            );

            expect(result.newQuantity).toBe(15);
            expect(mockGetProductByIdRepo).toHaveBeenCalledWith('p1', 'tenantA', false, { session: fakeSession });
            expect(mockUpdateProductRepo).toHaveBeenCalledWith('p1', { quantityInStock: 15 }, 'tenantA', { session: fakeSession });
            expect(mockCreateRepo).toHaveBeenCalledWith(
                expect.objectContaining({ tenantId: 'tenantA', previousQuantity: 5, newQuantity: 15, createdBy: 'u1' }),
                { session: fakeSession }
            );
            expect(mockAuditAction).toHaveBeenCalledWith('stock', 'create', null, expect.anything(), 'u1', { session: fakeSession });
            expect(mockAuditAction).toHaveBeenCalledWith('product', 'update', product, expect.anything(), 'u1', { session: fakeSession });
        });

        it('registers a withdrawal (out) movement and decreases stock', async () => {
            mockGetProductByIdRepo.mockResolvedValue({ _id: 'p1', quantityInStock: 10 });
            mockUpdateProductRepo.mockResolvedValue({});
            mockCreateRepo.mockResolvedValue({ _id: 'm2', newQuantity: 7 });

            const result = await createStockMovementService(
                { productId: 'p1', type: 'out', quantity: '3', reason: 'Avaria' },
                'tenantA',
                admin
            );

            expect(result.newQuantity).toBe(7);
            expect(mockUpdateProductRepo).toHaveBeenCalledWith('p1', { quantityInStock: 7 }, 'tenantA', { session: fakeSession });
        });

        it('rejects withdrawal without enough stock', async () => {
            mockGetProductByIdRepo.mockResolvedValue({ _id: 'p1', quantityInStock: 2 });

            await expect(createStockMovementService(
                { productId: 'p1', type: 'out', quantity: '5', reason: 'Avaria' },
                'tenantA',
                admin
            )).rejects.toMatchObject({ statusCode: 409 });
            expect(mockUpdateProductRepo).not.toHaveBeenCalled();
        });

        it('requires a reason for supply and withdrawal', async () => {
            mockGetProductByIdRepo.mockResolvedValue({ _id: 'p1', quantityInStock: 8 });

            for (const type of ['in', 'out']) {
                await expect(createStockMovementService(
                    { productId: 'p1', type, quantity: '1' },
                    'tenantA',
                    admin
                )).rejects.toMatchObject({ statusCode: 400 });
            }
            expect(mockUpdateProductRepo).not.toHaveBeenCalled();
        });

        it('rejects zero quantity for supply/withdrawal', async () => {
            await expect(createStockMovementService(
                { productId: 'p1', type: 'in', quantity: '0', reason: 'Compra' },
                'tenantA',
                admin
            )).rejects.toMatchObject({ statusCode: 400 });
        });

        it('registers an adjust movement as absolute quantity', async () => {
            mockGetProductByIdRepo.mockResolvedValue({ _id: 'p1', quantityInStock: 8 });
            mockUpdateProductRepo.mockResolvedValue({});
            mockCreateRepo.mockResolvedValue({ _id: 'm3', newQuantity: 20 });

            const result = await createStockMovementService(
                { productId: 'p1', type: 'adjust', quantity: '20', reason: 'Contagem física' },
                'tenantA',
                admin
            );

            expect(result.newQuantity).toBe(20);
            expect(mockUpdateProductRepo).toHaveBeenCalledWith('p1', { quantityInStock: 20 }, 'tenantA', { session: fakeSession });
        });

        it('requires a reason for stock adjustment', async () => {
            mockGetProductByIdRepo.mockResolvedValue({ _id: 'p1', quantityInStock: 8 });

            await expect(createStockMovementService(
                { productId: 'p1', type: 'adjust', quantity: '20' },
                'tenantA',
                admin
            )).rejects.toMatchObject({ statusCode: 400 });
        });

        it('blocks supply/withdrawal for users without stock:supply', async () => {
            for (const type of ['in', 'out']) {
                await expect(createStockMovementService(
                    { productId: 'p1', type, quantity: '1', reason: 'Teste' },
                    'tenantA',
                    employee
                )).rejects.toMatchObject({ statusCode: 403 });
            }
            expect(mockGetProductByIdRepo).not.toHaveBeenCalled();
        });

        it('allows supply for users granted stock:supply but not adjust', async () => {
            mockGetProductByIdRepo.mockResolvedValue({ _id: 'p1', quantityInStock: 1 });
            mockUpdateProductRepo.mockResolvedValue({});
            mockCreateRepo.mockResolvedValue({ _id: 'm4', newQuantity: 3 });

            await expect(createStockMovementService(
                { productId: 'p1', type: 'in', quantity: '2', reason: 'Compra' },
                'tenantA',
                supplier
            )).resolves.toMatchObject({ newQuantity: 3 });

            await expect(createStockMovementService(
                { productId: 'p1', type: 'adjust', quantity: '2', reason: 'Contagem' },
                'tenantA',
                supplier
            )).rejects.toMatchObject({ statusCode: 403 });
        });

        it('blocks supply when stock:supply was revoked from an admin', async () => {
            await expect(createStockMovementService(
                { productId: 'p1', type: 'in', quantity: '1', reason: 'Compra' },
                'tenantA',
                { ...admin, revokedPermissions: ['stock:supply'] }
            )).rejects.toMatchObject({ statusCode: 403 });
        });

        it('throws 404 when product not found in the tenant', async () => {
            mockGetProductByIdRepo.mockResolvedValue(null);

            await expect(createStockMovementService(
                { productId: 'p1', type: 'in', quantity: '5', reason: 'Compra' },
                'tenantB',
                admin
            )).rejects.toMatchObject({ statusCode: 404 });
            expect(mockGetProductByIdRepo).toHaveBeenCalledWith('p1', 'tenantB', false, { session: fakeSession });
        });

        it('rejects invalid movement type', async () => {
            await expect(createStockMovementService(
                { productId: 'p1', type: 'invalid', quantity: '5', reason: 'x' },
                'tenantA',
                admin
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
