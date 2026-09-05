import mongoose from "mongoose";

// Registra toda movimentação de estoque de um produto (entrada, saída e ajuste).
// Serve como histórico auditável das alterações de quantidade.
const stockMovementSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "tenants",
        required: true,
        index: true,
    },

    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "products",
        required: true,
        index: true,
    },

    // Tipo da movimentação: in (entrada), out (saída) ou adjust (ajuste absoluto).
    type: {
        type: String,
        enum: ["in", "out", "adjust"],
        required: true,
    },

    // Quantidade movimentada.
    // - in/out: valor delta adicionado ou removido do estoque.
    // - adjust: novo valor absoluto do estoque após o ajuste.
    quantity: {
        type: Number,
        required: true,
        min: 0,
    },

    // Quantidade anterior do produto no momento da movimentação.
    previousQuantity: {
        type: Number,
        required: true,
        min: 0,
    },

    // Quantidade posterior do produto após a movimentação.
    newQuantity: {
        type: Number,
        required: true,
        min: 0,
    },

    // Motivo ou observação da movimentação.
    reason: {
        type: String,
        trim: true,
        default: "",
    },

    // Referência externa (pedido, fornecedor, nota fiscal etc.), quando aplicável.
    reference: {
        type: String,
        trim: true,
        default: "",
    },

    // Usuário que registrou a movimentação.
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true,
    },
}, {
    timestamps: true,
});

export default mongoose.model("stockMovements", stockMovementSchema);
