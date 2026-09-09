import { describe, it, beforeAll, expect } from 'vitest';
import app from '../../app.js';
import { createTenant, createUser, loginAgent, createCategory, createProduct } from './helpers.js';

describe('tenant isolation integration', () => {
    let tenantA;
    let tenantB;
    let userB;
    let masterUser;
    let agentB;
    let agentMaster;
    let productA;

    beforeAll(async () => {
        tenantA = await createTenant({ name: 'Tenant A', slug: 'tenant-a-test', document: '12345678000190' });
        tenantB = await createTenant({ name: 'Tenant B', slug: 'tenant-b-test', document: '98765432000190' });

        await createUser({
            name: 'User A',
            email: 'user-a@test.com',
            password: 'user123',
            role: 'admin',
            tenantId: tenantA._id,
        });

        userB = await createUser({
            name: 'User B',
            email: 'user-b@test.com',
            password: 'user123',
            role: 'admin',
            tenantId: tenantB._id,
        });

        masterUser = await createUser({
            name: 'Master User',
            email: 'master-isolation@test.com',
            password: 'master123',
            role: 'master',
            tenantId: null,
        });

        agentB = (await loginAgent(app, userB.email, 'user123')).agent;
        agentMaster = (await loginAgent(app, masterUser.email, 'master123')).agent;

        const categoryA = await createCategory(tenantA._id, { name: 'Category A' });
        productA = await createProduct(tenantA._id, categoryA._id, {
            name: 'Product A',
            sku: 'SKU-A-001',
            price: 10,
            quantityInStock: 50,
        });
    });

    it('prevents tenant B from listing tenant A products', async () => {
        const res = await agentB.get('/api/v1/products');
        expect(res.status).toBe(200);
        expect(res.body.data.data).toHaveLength(0);
    });

    it('prevents tenant B from accessing tenant A product by id', async () => {
        const res = await agentB.get(`/api/v1/products/${productA._id}`);
        expect(res.status).toBe(404);
    });

    it('prevents tenant B from updating tenant A product', async () => {
        const res = await agentB.put(`/api/v1/products/${productA._id}`).send({ price: 99 });
        expect(res.status).toBe(404);
    });

    it('prevents tenant B from deleting tenant A product', async () => {
        const res = await agentB.delete(`/api/v1/products/${productA._id}`);
        expect(res.status).toBe(404);
    });

    it('allows master to access tenant A product by id using tenantId query', async () => {
        const res = await agentMaster
            .get(`/api/v1/products/${productA._id}`)
            .query({ tenantId: tenantA._id.toString() });
        expect(res.status).toBe(200);
        expect(res.body.data.product._id).toBe(productA._id.toString());
    });

    it('allows master to list tenant A products using tenantId query', async () => {
        const res = await agentMaster.get('/api/v1/products').query({ tenantId: tenantA._id.toString() });
        expect(res.status).toBe(200);
        expect(res.body.data.data).toHaveLength(1);
    });
});
