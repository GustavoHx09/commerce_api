import { describe, it, beforeAll, expect } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import app from '../../app.js';
import users from '../../modules/user/userModel.js';

const masterUser = {
    name: 'Master Test',
    email: 'master@integration.test',
    cpf: '52998224725',
    phone: '11999999999',
    password: 'master123',
    role: 'master',
    tenantId: null,
    isActive: true,
};

const inactiveUser = {
    name: 'Inactive Test',
    email: 'inactive@integration.test',
    cpf: '13651813169',
    phone: '11988888888',
    password: 'user123',
    role: 'admin',
    tenantId: null,
    isActive: false,
};

// Cria usuários de teste uma única vez para toda a suíte.
async function createTestUser(raw) {
    return users.create({
        ...raw,
        password: await bcrypt.hash(raw.password, 10),
    });
}

describe('auth integration', () => {
    beforeAll(async () => {
        await createTestUser(masterUser);
        await createTestUser(inactiveUser);
    });

    it('logs in a valid master user and sets an HttpOnly cookie', async () => {
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: masterUser.email, password: masterUser.password });

        expect(res.status).toBe(200);
        expect(res.body.data.user).toMatchObject({
            email: masterUser.email,
            role: 'master',
        });

        const cookies = res.headers['set-cookie'];
        expect(cookies).toBeDefined();
        expect(cookies[0]).toMatch(/HttpOnly/);
    });

    it('rejects invalid credentials', async () => {
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: masterUser.email, password: 'wrongpassword' });

        expect(res.status).toBe(401);
    });

    it('rejects inactive users', async () => {
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: inactiveUser.email, password: inactiveUser.password });

        expect(res.status).toBe(403);
    });

    it('returns session data for an authenticated request', async () => {
        const agent = request.agent(app);

        const login = await agent
            .post('/api/v1/auth/login')
            .send({ email: masterUser.email, password: masterUser.password });
        expect(login.status).toBe(200);

        const session = await agent.get('/api/v1/auth/session');

        expect(session.status).toBe(200);
        expect(session.body.data.user).toMatchObject({
            email: masterUser.email,
            role: 'master',
        });
    });

    it('revokes session on logout', async () => {
        const agent = request.agent(app);

        const login = await agent
            .post('/api/v1/auth/login')
            .send({ email: masterUser.email, password: masterUser.password });
        expect(login.status).toBe(200);

        const logout = await agent.post('/api/v1/auth/logout');
        expect(logout.status).toBe(200);

        const session = await agent.get('/api/v1/auth/session');
        expect(session.status).toBe(401);
    });
});
