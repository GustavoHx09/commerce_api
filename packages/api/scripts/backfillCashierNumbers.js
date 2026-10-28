// Backfill: numera caixas antigos que não têm cashierNumber (sequência por
// tenant ordenada pela abertura) e ajusta o cashierCounter de cada empresa
// para o maior número usado, evitando colisão nas próximas aberturas.
// Uso: node scripts/backfillCashierNumbers.js (com o Mongo local no ar).

import mongoose from "mongoose";
import "dotenv/config";

const uri = process.env.MONGO_URI || "mongodb://localhost:27017/commerce_api_dev?replicaSet=rs0";
await mongoose.connect(uri);
const db = mongoose.connection.db;

const cashiers = await db.collection("cashiers")
    .find({ cashierNumber: { $exists: false } })
    .sort({ tenantId: 1, openedAt: 1 })
    .toArray();

// Maior número já usado por tenant, para o contador continuar de onde parou.
const maxByTenant = new Map();
const existing = await db.collection("cashiers")
    .find({ cashierNumber: { $type: "number" } })
    .project({ tenantId: 1, cashierNumber: 1 })
    .toArray();
for (const c of existing) {
    const key = String(c.tenantId);
    maxByTenant.set(key, Math.max(maxByTenant.get(key) || 0, c.cashierNumber));
}

let updated = 0;
for (const cashier of cashiers) {
    const key = String(cashier.tenantId);
    const next = (maxByTenant.get(key) || 0) + 1;
    maxByTenant.set(key, next);
    await db.collection("cashiers").updateOne(
        { _id: cashier._id },
        { $set: { cashierNumber: next } }
    );
    updated++;
}

// Ajusta o contador de cada tenant para o maior número usado.
for (const [tenantId, max] of maxByTenant) {
    await db.collection("tenants").updateOne(
        { _id: new mongoose.Types.ObjectId(tenantId) },
        { $set: { cashierCounter: max } }
    );
}

console.log(`Backfill concluído: ${updated} caixa(s) numerado(s), ${maxByTenant.size} empresa(s) ajustada(s).`);
await mongoose.disconnect();
