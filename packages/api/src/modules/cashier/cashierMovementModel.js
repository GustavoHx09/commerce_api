import mongoose from "mongoose";

// Movimentações financeiras de caixa: suprimento (reforço) e sangria (retirada).
const cashierMovementSchema = new mongoose.Schema({
    cashierId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "cashiers",
        required: true,
        index: true,
    },

    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "tenants",
        required: true,
        index: true,
    },

    type: {
        type: String,
        enum: ["suprimento", "sangria"],
        required: true,
    },

    amount: {
        type: Number,
        required: true,
        min: 0,
    },

    reason: {
        type: String,
        trim: true,
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true,
    },
}, {
    timestamps: true,
});

export default mongoose.model("cashierMovements", cashierMovementSchema);
