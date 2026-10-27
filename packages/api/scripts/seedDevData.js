// Seed de dados de teste para o ambiente de desenvolvimento.
// Popula a empresa de teste (Loja Exemplo) com clientes, fornecedores,
// vendas distribuídas em meses diferentes, pagamentos e contas.
// Uso: node scripts/seedDevData.js (com o Mongo local no ar).

import mongoose from "mongoose";
import "dotenv/config";

const uri = process.env.MONGO_URI || "mongodb://localhost:27017/commerce_api_dev?replicaSet=rs0";
await mongoose.connect(uri);
const db = mongoose.connection.db;

// Empresa e usuário admin de teste já existentes no banco dev.
const tenant = await db.collection("tenants").findOne({ displayName: /exemplo/i }) ||
    await db.collection("tenants").findOne({});
const admin = await db.collection("users").findOne({ role: "admin", tenantId: tenant._id });
const openCashier = await db.collection("cashiers").findOne({ tenantId: tenant._id, status: "open" });
const products = await db.collection("products").find({ tenantId: tenant._id, deletedAt: null }).toArray();

if (!tenant || !admin) throw new Error("Tenant ou admin de teste não encontrado");

console.log(`Seed na empresa: ${tenant.displayName || tenant.name} (${tenant._id})`);

const now = new Date();
const daysAgo = (days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

// --- Clientes de teste ------------------------------------------------------
const customersSeed = [
    { name: "Maria Silva", document: "11122233344", phone: "11990001122" },
    { name: "João Pereira", document: "22233344455", phone: "11998887766" },
    { name: "Ana Costa", document: "33344455566", email: "ana.costa@teste.com" },
    { name: "Empresa Beta LTDA", document: "12345678000199", phone: "1133221100" },
];

for (const c of customersSeed) {
    const exists = await db.collection("customers").findOne({ tenantId: tenant._id, document: c.document });
    if (!exists) {
        await db.collection("customers").insertOne({
            ...c, tenantId: tenant._id, isActive: true, deletedAt: null,
            createdBy: admin._id, createdAt: daysAgo(90), updatedAt: daysAgo(90),
        });
        console.log(`Cliente criado: ${c.name}`);
    }
}
const customers = await db.collection("customers").find({ tenantId: tenant._id, deletedAt: null }).toArray();

// --- Fornecedores de teste --------------------------------------------------
const suppliersSeed = [
    { name: "Distribuidora Central", document: "98765432000188", phone: "1144445555" },
    { name: "Atacado Sul", document: "11223344000177", email: "contato@atacadosul.com" },
];

for (const s of suppliersSeed) {
    const exists = await db.collection("suppliers").findOne({ tenantId: tenant._id, document: s.document });
    if (!exists) {
        await db.collection("suppliers").insertOne({
            ...s, tenantId: tenant._id, isActive: true, deletedAt: null,
            createdBy: admin._id, createdAt: daysAgo(60), updatedAt: daysAgo(60),
        });
        console.log(`Fornecedor criado: ${s.name}`);
    }
}
const suppliers = await db.collection("suppliers").find({ tenantId: tenant._id, deletedAt: null }).toArray();

// --- Vendas em meses diferentes ---------------------------------------------
// orderNumber segue o contador do tenant para não colidir com vendas reais.
const tenantDoc = await db.collection("tenants").findOne({ _id: tenant._id });
let orderNumber = (tenantDoc.orderCounter || 0);

// Monta itens a partir dos produtos existentes; se não houver produto, usa snapshot genérico.
const buildItems = (list) => list.map(([qty, price, idx]) => {
    const product = products[idx % Math.max(products.length, 1)];
    return {
        productId: product?._id || new mongoose.Types.ObjectId(),
        name: product?.name || "Produto teste",
        sku: product?.sku || "TST",
        unit: product?.unit || "un",
        quantity: qty,
        unitPrice: price,
        discount: 0,
        total: qty * price,
    };
});

const salesSeed = [
    { daysAgo: 88, status: "paid", items: [[2, 89.9, 0]], method: "cash", customer: 0 },
    { daysAgo: 74, status: "paid", items: [[1, 350, 0], [1, 49.9, 0]], method: "pix", customer: 1 },
    { daysAgo: 58, status: "canceled", items: [[1, 199.9, 0]], method: "credit_card", installments: 3, customer: 2 },
    { daysAgo: 41, status: "paid", items: [[3, 59.9, 0]], method: "debit_card", customer: 3 },
    { daysAgo: 27, status: "paid", items: [[1, 1200, 0]], method: "credit_card", installments: 6, customer: 0 },
    { daysAgo: 13, status: "paid", items: [[2, 75, 0], [1, 199.9, 0]], method: "cash", customer: 1 },
    { daysAgo: 5, status: "canceled", items: [[1, 89.9, 0]], method: "cash", customer: 2 },
];

for (const sale of salesSeed) {
    const items = buildItems(sale.items);
    const subtotal = items.reduce((sum, i) => sum + i.total, 0);
    orderNumber += 1;
    const createdAt = daysAgo(sale.daysAgo);

    const order = {
        orderNumber,
        tenantId: tenant._id,
        cashierId: openCashier?._id || null,
        customerId: customers[sale.customer]?._id || null,
        items,
        subtotal,
        discount: 0,
        total: subtotal,
        change: 0,
        paymentIds: [],
        status: sale.status,
        notes: "Venda de teste (seed)",
        createdBy: admin._id,
        deletedAt: null,
        createdAt,
        updatedAt: createdAt,
    };

    const payment = {
        tenantId: tenant._id,
        method: sale.method,
        amount: subtotal,
        status: sale.status === "canceled" ? "canceled" : "confirmed",
        installments: sale.installments || 1,
        paidAt: createdAt,
        createdBy: admin._id,
        deletedAt: null,
        createdAt,
        updatedAt: createdAt,
    };

    const [insertedPayment] = (await db.collection("payments").insertOne(payment)).insertedId
        ? [payment] : [payment];
    order.paymentIds = [payment._id];
    await db.collection("orders").insertOne(order);
    payment.orderId = order._id;
    await db.collection("payments").updateOne({ _id: payment._id }, { $set: { orderId: order._id } });
    console.log(`Venda #${orderNumber} (${sale.status}) - R$ ${subtotal.toFixed(2)} em ${createdAt.toISOString().slice(0, 10)}`);
}

// Atualiza o contador sequencial do tenant para as próximas vendas reais.
await db.collection("tenants").updateOne({ _id: tenant._id }, { $set: { orderCounter: orderNumber } });

// --- Contas a pagar/receber --------------------------------------------------
const billsSeed = [
    { type: "pay", description: "Fornecimento mensal", amount: 850, supplier: 0, daysAgo: -5 },
    { type: "pay", description: "Conta de energia", amount: 320.5, daysAgo: -10 },
    { type: "receive", description: "Venda fiado - Maria", amount: 250, customer: 0, daysAgo: -3 },
    { type: "receive", description: "Serviço contratado", amount: 480, customer: 3, daysAgo: -15, paid: true },
];

for (const b of billsSeed) {
    await db.collection("bills").insertOne({
        type: b.type,
        description: b.description,
        amount: b.amount,
        dueDate: daysAgo(b.daysAgo),
        status: b.paid ? "paid" : "pending",
        paidAt: b.paid ? daysAgo(2) : null,
        tenantId: tenant._id,
        supplierId: suppliers[b.supplier]?._id || null,
        customerId: customers[b.customer]?._id || null,
        createdBy: admin._id,
        deletedAt: null,
        createdAt: daysAgo(Math.abs(b.daysAgo) + 5),
        updatedAt: daysAgo(Math.abs(b.daysAgo) + 5),
    });
    console.log(`Conta ${b.type}: ${b.description}`);
}

console.log("Seed concluído.");
await mongoose.disconnect();
