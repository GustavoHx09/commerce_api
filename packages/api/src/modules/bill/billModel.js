import mongoose from "mongoose";

// Conta a pagar ou a receber do tenant.
const billSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "tenants",
        required: true,
        index: true,
    },

    type: {
        type: String,
        enum: ["pay", "receive"],
        required: true,
    },

    description: {
        type: String,
        required: true,
        trim: true,
    },

    amount: {
        type: Number,
        required: true,
        min: 0,
    },

    dueDate: {
        type: Date,
        required: true,
    },

    status: {
        type: String,
        enum: ["pending", "paid", "cancelled"],
        default: "pending",
    },

    paidAt: {
        type: Date,
    },

    // Contato vinculado: fornecedor para pagar, cliente para receber.
    contactId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "contactType",
    },

    contactType: {
        type: String,
        enum: ["suppliers", "customers"],
    },

    notes: {
        type: String,
        trim: true,
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true,
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

billSchema.index({ tenantId: 1, dueDate: 1 });
billSchema.index({ tenantId: 1, status: 1 });

export default mongoose.model("bills", billSchema);
