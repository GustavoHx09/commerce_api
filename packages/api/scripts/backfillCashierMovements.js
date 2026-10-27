// Backfill de movimentações de caixa para vendas históricas.
// Antes da correção, só vendas com dinheiro geravam movimentação "venda".
// Este script cria a movimentação faltante para cada venda paga com caixa
// vinculado: amount = parte em dinheiro líquida do troco (zero em pix/cartão).
// Uso: node scripts/backfillCashierMovements.js (com o Mongo local no ar).

import mongoose from "mongoose";
import "dotenv/config";

const uri = process.env.MONGO_URI || "mongodb://localhost:27017/commerce_api_dev?replicaSet=rs0";
await mongoose.connect(uri);
const db = mongoose.connection.db;

const orders = await db.collection("orders")
    .find({ cashierId: { $ne: null }, status: "paid", deletedAt: null })
    .toArray();

let created = 0;
for (const order of orders) {
    // Atenção: a collection real do Mongoose é "cashiermovements" (minúscula).
    const exists = await db.collection("cashiermovements").findOne({
        orderId: order._id,
        type: "venda",
    });
    if (exists) continue;

    // Parte em dinheiro = soma dos pagamentos "cash" menos o troco da venda.
    const payments = await db.collection("payments")
        .find({ orderId: order._id, status: "paid" })
        .toArray();
    const cashGiven = payments
        .filter((p) => p.method === "cash")
        .reduce((sum, p) => sum + p.amount, 0);
    const amount = Math.max(0, Math.round((cashGiven - (order.change || 0)) * 100) / 100);

    await db.collection("cashiermovements").insertOne({
        cashierId: order.cashierId,
        tenantId: order.tenantId,
        type: "venda",
        orderId: order._id,
        billId: null,
        amount,
        reason: `Venda #${order.orderNumber}`,
        createdBy: order.createdBy,
        createdAt: order.createdAt,
        updatedAt: order.createdAt,
    });
    created++;
}

console.log(`Movimentações criadas: ${created} de ${orders.length} vendas verificadas`);
await mongoose.disconnect();
