import mongoose from "mongoose";

// Pagamento vinculado a um pedido. No MVP um pedido possui um único pagamento,
// mas a estrutura permite evoluir para múltiplos pagamentos no futuro.
const paymentSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "tenants",
        required: true,
        index: true,
    },

    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "orders",
        required: true,
        index: true,
    },

    cashierId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "cashiers",
    },

    amount: {
        type: Number,
        required: true,
        min: 0,
    },

    method: {
        type: String,
        enum: ["cash", "pix", "credit_card", "debit_card", "other"],
        required: true,
    },

    status: {
        type: String,
        enum: ["pending", "paid", "canceled", "refunded"],
        default: "paid",
    },

    reference: {
        type: String,
        trim: true,
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true,
    },

    canceledAt: {
        type: Date,
    },

    canceledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
    },
}, {
    timestamps: true,
});

export default mongoose.model("payments", paymentSchema);
