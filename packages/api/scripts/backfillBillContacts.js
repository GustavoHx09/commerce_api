// Backfill: migra os campos legados supplierId/customerId das contas criadas
// pelo seed antigo para o schema atual (contactId + contactType), removendo
// os campos fora do schema. Uso: node scripts/backfillBillContacts.js.

import mongoose from "mongoose";
import "dotenv/config";

const uri = process.env.MONGO_URI || "mongodb://localhost:27017/commerce_api_dev?replicaSet=rs0";
await mongoose.connect(uri);
const db = mongoose.connection.db;

const bills = await db.collection("bills")
    .find({
        $or: [
            { supplierId: { $ne: null, $exists: true } },
            { customerId: { $ne: null, $exists: true } },
            // contactId preenchido sem contactType impede o populate (refPath).
            { contactId: { $ne: null }, contactType: null },
        ],
    })
    .toArray();

let updated = 0;
for (const bill of bills) {
    // Não sobrescreve um contactId já preenchido.
    const contactId = bill.contactId || bill.supplierId || bill.customerId || null;
    let contactType = bill.contactType ||
        (bill.supplierId ? "suppliers" : bill.customerId ? "customers" : null);

    // contactType ausente com contactId: descobre a coleção procurando o id.
    if (contactId && !contactType) {
        const asSupplier = await db.collection("suppliers").findOne({ _id: contactId });
        const asCustomer = asSupplier ? null : await db.collection("customers").findOne({ _id: contactId });
        contactType = asSupplier ? "suppliers" : asCustomer ? "customers" : null;
    }

    await db.collection("bills").updateOne(
        { _id: bill._id },
        {
            $set: { contactId, contactType },
            $unset: { supplierId: "", customerId: "" },
        }
    );
    updated++;
}

console.log(`Backfill concluído: ${updated} conta(s) migrada(s) para contactId/contactType.`);
await mongoose.disconnect();
