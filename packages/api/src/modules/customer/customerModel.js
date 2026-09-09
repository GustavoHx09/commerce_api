import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
    street: { type: String, trim: true },
    number: { type: String, trim: true },
    complement: { type: String, trim: true },
    neighborhood: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    zipCode: { type: String, trim: true },
}, { _id: false });

// Cliente de um tenant. CPF/CNPJ deve ser único por empresa.
const customerSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "tenants",
        required: true,
        index: true,
    },

    name: {
        type: String,
        required: true,
        trim: true,
    },

    document: {
        type: String,
        required: true,
        trim: true,
    },

    documentType: {
        type: String,
        enum: ["cpf", "cnpj"],
        required: true,
    },

    phone: {
        type: String,
        trim: true,
    },

    email: {
        type: String,
        trim: true,
        lowercase: true,
    },

    address: {
        type: addressSchema,
        default: {},
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

customerSchema.index(
    { tenantId: 1, document: 1 },
    { unique: true, partialFilterExpression: { deletedAt: null } }
);

export default mongoose.model("customers", customerSchema);
