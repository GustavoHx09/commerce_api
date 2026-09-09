import crypto from "crypto";
import request from "supertest";
import bcrypt from "bcrypt";
import tenants from "../../modules/tenant/tenantModel.js";
import users from "../../modules/user/userModel.js";
import categories from "../../modules/category/categoryModel.js";
import products from "../../modules/product/productModel.js";

// Helpers reutilizáveis para testes de integração. Mantêm a configuração de
// tenant, usuários e autenticação em um único lugar.

let counter = 0;

function uniqueId() {
    return `${Date.now()}-${++counter}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function createTenant(overrides = {}) {
    const id = uniqueId();
    return tenants.create({
        name: `Tenant Test ${id}`,
        slug: `tenant-test-${id}`,
        document: id,
        documentType: "cnpj",
        phone: "11999999999",
        email: `tenant-${id}@test.com`,
        ...overrides,
    });
}

export async function createUser(overrides = {}) {
    const id = uniqueId();
    const rawPassword = overrides.password || "password123";
    const password = await bcrypt.hash(rawPassword, 10);

    return users.create({
        name: `Test User ${id}`,
        email: `user-${id}@test.com`,
        cpf: id,
        phone: "11999999999",
        role: "user",
        tenantId: null,
        isActive: true,
        permissions: [],
        revokedPermissions: [],
        ...overrides,
        password,
    });
}

export async function loginAgent(app, email, password) {
    const agent = request.agent(app);
    const res = await agent.post("/api/v1/auth/login").send({ email, password });
    if (res.status !== 200) {
        throw new Error(`Login failed: ${res.status} ${JSON.stringify(res.body)}`);
    }
    return { agent, user: res.body.data.user };
}

export async function createCategory(tenantId, overrides = {}) {
    const id = uniqueId();
    return categories.create({
        tenantId,
        name: `Category ${id}`,
        ...overrides,
    });
}

export async function createProduct(tenantId, categoryId, overrides = {}) {
    const id = uniqueId();
    return products.create({
        tenantId,
        categoryId,
        name: `Product ${id}`,
        sku: `SKU-${id}`,
        unit: "un",
        price: 10,
        quantityInStock: 100,
        ...overrides,
    });
}
