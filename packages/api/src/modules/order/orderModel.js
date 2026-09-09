import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "products",
        required: true,
    },

    name: {
        type: String,
        required: true,
    },

    sku: {
        type: String,
        required: true,
    },

    unit: {
        type: String,
        required: true,
    },

    quantity: {
        type: Number,
        required: true,
        min: 0,
    },

    unitPrice: {
        type: Number,
        required: true,
        min: 0,
    },

    discount: {
        type: Number,
        default: 0,
        min: 0,
    },

    total: {
        type: Number,
        required: true,
        min: 0,
    },
}, { _id: false });

// Pedido/venda de um tenant. Itens são embedados para snapshot de preço e performance.
const orderSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "tenants",
        required: true,
        index: true,
    },

    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "customers",
    },

    cashierId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "cashiers",
        required: true,
    },

    items: {
        type: [orderItemSchema],
        required: true,
        validate: [arr => arr.length > 0, "Pedido deve conter pelo menos um item"],
    },

    discount: {
        type: Number,
        default: 0,
        min: 0,
    },

    total: {
        type: Number,
        required: true,
        min: 0,
    },

    amountPaid: {
        type: Number,
        required: true,
        min: 0,
    },

    change: {
        type: Number,
        default: 0,
        min: 0,
    },

    status: {
        type: String,
        enum: ["draft", "confirmed", "paid", "canceled", "delivered"],
        default: "paid",
    },

    paymentIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "payments",
    }],

    observations: {
        type: String,
        trim: true,
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true,
    },

    canceledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
    },

    canceledAt: {
        type: Date,
    },

    cancelReason: {
        type: String,
        trim: true,
    },

    deletedAt: {
        type: Date,
        default: null,
    },
}, {
    timestamps: true,
});

orderSchema.index({ tenantId: 1, cashierId: 1, status: 1 });
orderSchema.index({ tenantId: 1, customerId: 1 });

export default mongoose.model("orders", orderSchema);
