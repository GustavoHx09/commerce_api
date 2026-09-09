import { describe, it, beforeAll, expect } from 'vitest';
import app from '../../app.js';
import { createTenant, createUser, loginAgent, createCategory, createProduct } from './helpers.js';

describe('granular authorization integration', () => {
    let tenant;
    let readerUser;
    let writerUser;
    let restrictedUser;
    let readerAgent;
    let writerAgent;
    let restrictedAgent;
    let category;

    beforeAll(async () => {
        tenant = await createTenant({ name: 'Authz Tenant', slug: 'authz-tenant', document: '12345678000191' });

        readerUser = await createUser({
            name: 'Reader User',
            email: 'reader@test.com',
            password: 'user123',
            role: 'admin',
            tenantId: tenant._id,
            revokedPermissions: ['products:write', 'products:delete'],
        });

        writerUser = await createUser({
            name: 'Writer User',
            email: 'writer@test.com',
            password: 'user123',
            role: 'admin',
            tenantId: tenant._id,
            revokedPermissions: ['products:delete'],
        });

        restrictedUser = await createUser({
            name: 'Restricted User',
            email: 'restricted@test.com',
            password: 'user123',
            role: 'admin',
            tenantId: tenant._id,
            revokedPermissions: ['orders:delete'],
        });

        readerAgent = (await loginAgent(app, readerUser.email, 'user123')).agent;
        writerAgent = (await loginAgent(app, writerUser.email, 'user123')).agent;
        restrictedAgent = (await loginAgent(app, restrictedUser.email, 'user123')).agent;

        category = await createCategory(tenant._id, { name: 'Authz Category' });
    });

    it('allows reading products without write permission', async () => {
        const res = await readerAgent.get('/api/v1/products');
        expect(res.status).toBe(200);
    });

    it('blocks creating products when products:write is revoked', async () => {
        const res = await readerAgent.post('/api/v1/products').send({
            name: 'New Product',
            sku: 'SKU-READER-001',
            unit: 'un',
            price: 10,
            categoryId: category._id.toString(),
        });
        expect(res.status).toBe(403);
    });

    it('allows creating products when products:write is granted', async () => {
        const res = await writerAgent.post('/api/v1/products').send({
            name: 'Writable Product',
            sku: 'SKU-WRITER-001',
            unit: 'un',
            price: 10,
            categoryId: category._id.toString(),
        });
        expect(res.status).toBe(201);
    });

    it('blocks deleting products when products:delete is revoked', async () => {
        const product = await createProduct(tenant._id, category._id, {
            name: 'Protected Product',
            sku: 'SKU-PROTECTED-001',
        });
        const res = await writerAgent.delete(`/api/v1/products/${product._id}`);
        expect(res.status).toBe(403);
    });

    it('blocks canceling orders when orders:delete is revoked', async () => {
        // Usa um produto e caixa para criar um pedido válido.
        const product = await createProduct(tenant._id, category._id, {
            name: 'Order Authz Product',
            sku: 'SKU-ORDER-AUTHZ-001',
            price: 10,
            quantityInStock: 10,
        });

        const cashierRes = await restrictedAgent.post('/api/v1/cashiers').send({ initialAmount: 100 });
        expect(cashierRes.status).toBe(201);
        const cashierId = cashierRes.body.data.cashier._id;

        const orderRes = await restrictedAgent.post('/api/v1/orders').send({
            cashierId,
            items: [{ productId: product._id.toString(), quantity: 1 }],
            payment: { method: 'cash', amount: 10 },
        });
        expect(orderRes.status).toBe(201);
        const orderId = orderRes.body.data.order._id;

        const cancelRes = await restrictedAgent.put(`/api/v1/orders/${orderId}/cancel`).send({ cancelReason: 'Test' });
        expect(cancelRes.status).toBe(403);
    });
});
