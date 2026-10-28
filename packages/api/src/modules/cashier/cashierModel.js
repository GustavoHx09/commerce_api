import mongoose from "mongoose";

// Caixa de um tenant. Apenas um caixa aberto por usuário/tenant por vez.
const cashierSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "tenants",
        required: true,
        index: true,
    },

    openedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true,
    },

    closedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
    },

    // Número sequencial do caixa por tenant (1, 2, 3...), como o orderNumber das vendas.
    cashierNumber: {
        type: Number,
    },

    openedAt: {
        type: Date,
        default: Date.now,
    },

    closedAt: {
        type: Date,
    },

    initialAmount: {
        type: Number,
        required: true,
        min: 0,
    },

    finalAmount: {
        type: Number,
    },

    status: {
        type: String,
        enum: ["open", "closed"],
        default: "open",
    },

    isActive: {
        type: Boolean,
        default: true,
    },

    deletedAt: {
        type: Date,
        default: null,
    },
}, {
    timestamps: true,
});

// Garante um único caixa aberto por usuário dentro do mesmo tenant.
cashierSchema.index(
    { tenantId: 1, openedBy: 1, status: 1 },
    { unique: true, partialFilterExpression: { status: "open", deletedAt: null } }
);

// Número sequencial único por tenant (parcial: só vale quando preenchido).
cashierSchema.index(
    { tenantId: 1, cashierNumber: 1 },
    { unique: true, partialFilterExpression: { cashierNumber: { $type: "number" } } }
);

export default mongoose.model("cashiers", cashierSchema);
