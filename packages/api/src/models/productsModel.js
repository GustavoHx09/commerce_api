import mongoose from "mongoose";

const productsSchema = new mongoose.Schema({
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

    deletedAt: {
        type: Date,
        default: null,
    },
}, {
    timestamps: true,
});

export default mongoose.model('products', productsSchema);
