import mongoose from "mongoose";

// Modelo de produto vinculado a um tenant com suporte a soft delete.
const productsSchema = new mongoose.Schema({
    // Tenant ao qual o produto pertence.
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'tenants',
        required: true,
    },

    name: {
        type: String,
        required: true,
        trim: true,
    },

    description: {
        type: String,
        required: false,
    },

    price: {
        type: Number,
        required: true,
        min: 0,
    },

    costPrice: {
        type: Number,
        required: true,
        min: 0,
    },

    quantityInStock: {
        type: Number,
        required: true,
        min: 0,
    },

    category: {
        type: String,
        required: true,
        trim: true,
    },

    // Data de exclusão lógica (soft delete).
    deletedAt: {
        type: Date,
        default: null,
    },
}, {
    timestamps: true,
});

export default mongoose.model('products', productsSchema);
