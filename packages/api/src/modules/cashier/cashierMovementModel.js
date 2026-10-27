import mongoose from "mongoose";

// Movimentações financeiras de caixa registradas em tempo real:
// suprimento/sangria (manuais), venda/estorno (PDV) e pagamento/recebimento de contas.
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
        enum: ["suprimento", "sangria", "venda", "estorno", "pagamento_conta", "recebimento_conta"],
        required: true,
    },

    // Referência à venda quando a movimentação vem do PDV (venda/estorno).
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "orders",
    },

    // Referência à conta quando a movimentação vem de contas a pagar/receber.
    billId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "bills",
    },

    // Valor sempre positivo; a direção (entrada/saída) é definida pelo tipo.
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
