import { describe, it, beforeAll, expect } from 'vitest';
import app from '../../app.js';
import { createTenant, createUser, loginAgent, createCategory, createProduct } from './helpers.js';

describe('order lifecycle integration', () => {
    let tenant;
    let admin;
    let agent;
    let category;
    let product;
    let cashier;
    let order;

    beforeAll(async () => {
        tenant = await createTenant({ name: 'Order Flow Tenant', slug: 'order-flow-tenant', document: '12345678000192' });
        admin = await createUser({
            name: 'Order Admin',
            email: 'order-admin@test.com',
            password: 'admin123',
            role: 'admin',
            tenantId: tenant._id,
        });
        agent = (await loginAgent(app, admin.email, 'admin123')).agent;

        category = await createCategory(tenant._id, { name: 'Order Category' });
        product = await createProduct(tenant._id, category._id, {
            name: 'Order Product',
            sku: 'SKU-ORDER-001',
            price: 25,
            quantityInStock: 10,
        });

        const cashierRes = await agent.post('/api/v1/cashiers').send({ initialAmount: 100 });
        expect(cashierRes.status).toBe(201);
        cashier = cashierRes.body.data.cashier;

        const orderRes = await agent.post('/api/v1/orders').send({
            cashierId: cashier._id,
            items: [{ productId: product._id.toString(), quantity: 2 }],
            payment: { method: 'cash', amount: 50 },
        });
        expect(orderRes.status).toBe(201);
        order = orderRes.body.data.order;
    });

    it('creates a paid order and decrements stock', async () => {
        expect(order.status).toBe('paid');
        expect(order.total).toBe(50);

        const productRes = await agent.get(`/api/v1/products/${product._id}`);
        expect(productRes.status).toBe(200);
        expect(productRes.body.data.product.quantityInStock).toBe(8);
    });

    it('creates a payment linked to the order', async () => {
        const paymentsRes = await agent.get('/api/v1/payments').query({ orderId: order._id.toString() });
        expect(paymentsRes.status).toBe(200);
        expect(paymentsRes.body.data.data).toHaveLength(1);
        expect(paymentsRes.body.data.data[0].amount).toBe(50);
        expect(paymentsRes.body.data.data[0].status).toBe('paid');
    });

    it('cancels the order, restores stock and cancels the payment', async () => {
        const cancelRes = await agent.put(`/api/v1/orders/${order._id}/cancel`).send({ cancelReason: 'Cliente desistiu' });
        expect(cancelRes.status).toBe(200);
        expect(cancelRes.body.data.order.status).toBe('canceled');

        const productRes = await agent.get(`/api/v1/products/${product._id}`);
        expect(productRes.status).toBe(200);
        expect(productRes.body.data.product.quantityInStock).toBe(10);

        const paymentsRes = await agent.get('/api/v1/payments').query({ orderId: order._id.toString() });
        expect(paymentsRes.status).toBe(200);
        expect(paymentsRes.body.data.data[0].status).toBe('canceled');
    });
});

describe('cashier balance integration', () => {
    let tenant;
    let admin;
    let agent;
    let category;
    let product;

    beforeAll(async () => {
        tenant = await createTenant({ name: 'Cashier Tenant', slug: 'cashier-tenant', document: '12345678000193' });
        admin = await createUser({
            name: 'Cashier Admin',
            email: 'cashier-admin@test.com',
            password: 'admin123',
            role: 'admin',
            tenantId: tenant._id,
        });
        agent = (await loginAgent(app, admin.email, 'admin123')).agent;

        category = await createCategory(tenant._id, { name: 'Cashier Category' });
        product = await createProduct(tenant._id, category._id, {
            name: 'Cashier Product',
            sku: 'SKU-CASHIER-001',
            price: 30,
            quantityInStock: 5,
        });
    });

    it('includes paid orders in the cashier final balance', async () => {
        const cashierRes = await agent.post('/api/v1/cashiers').send({ initialAmount: 200 });
        expect(cashierRes.status).toBe(201);
        const cashier = cashierRes.body.data.cashier;

        const orderRes = await agent.post('/api/v1/orders').send({
            cashierId: cashier._id,
            items: [{ productId: product._id.toString(), quantity: 1 }],
            payment: { method: 'pix', amount: 30 },
        });
        expect(orderRes.status).toBe(201);

        const closeRes = await agent.put(`/api/v1/cashiers/${cashier._id}/close`);
        expect(closeRes.status).toBe(200);
        expect(closeRes.body.data.cashier.finalAmount).toBe(230);
        expect(closeRes.body.data.cashier.status).toBe('closed');
    });

    it('excludes canceled orders from the cashier final balance', async () => {
        const cashierRes = await agent.post('/api/v1/cashiers').send({ initialAmount: 200 });
        expect(cashierRes.status).toBe(201);
        const cashier = cashierRes.body.data.cashier;

        const orderRes = await agent.post('/api/v1/orders').send({
            cashierId: cashier._id,
            items: [{ productId: product._id.toString(), quantity: 1 }],
            payment: { method: 'pix', amount: 30 },
        });
        expect(orderRes.status).toBe(201);
        const orderId = orderRes.body.data.order._id;

        const cancelRes = await agent.put(`/api/v1/orders/${orderId}/cancel`).send({ cancelReason: 'Teste' });
        expect(cancelRes.status).toBe(200);

        const closeRes = await agent.put(`/api/v1/cashiers/${cashier._id}/close`);
        expect(closeRes.status).toBe(200);
        expect(closeRes.body.data.cashier.finalAmount).toBe(200);
    });
});
