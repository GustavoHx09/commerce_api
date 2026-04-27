import mongoose from "mongoose";

const productsSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },

    description: {
        type: String,
        required: false
    },

    price: {
        type: Number,
        required: true,
        min: 0
    },

    quantityInStock: {
        type: Number,
        required: true,
        min: 0
    },

    category: {
        type: String,
        required: true,
        trim: true
    },

}, {
    // para atualizar no banco o momento da inquisição
    timestamps: true
});

export default mongoose.model('products', productsSchema);