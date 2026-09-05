import mongoose from "mongoose";

// Unidades de medida aceitas para produtos.
const UNIT_ENUM = [
    "un",     // unidade
    "kg",     // quilograma
    "g",      // grama
    "lt",     // litro
    "ml",     // mililitro
    "m",      // metro
    "cm",     // centímetro
    "par",    // par
    "cx",     // caixa
];

// Modelo de produto vinculado a um tenant e a uma categoria, com suporte a soft delete.
const productsSchema = new mongoose.Schema({
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

    description: {
        type: String,
        required: false,
        trim: true,
    },

    // Código interno/SKU do produto. Único por tenant e não excluído.
    sku: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
    },

    // Unidade de medida do produto.
    unit: {
        type: String,
        enum: UNIT_ENUM,
        default: "un",
    },

    // Preço de venda do produto.
    price: {
        type: Number,
        required: true,
        min: 0,
    },

    // Preço de custo do produto. Opcional.
    costPrice: {
        type: Number,
        min: 0,
        default: null,
    },

    // Quantidade atual em estoque.
    quantityInStock: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
    },

    // Quantidade mínima que dispara alerta de estoque baixo.
    minStock: {
        type: Number,
        min: 0,
        default: 0,
    },

    // Categoria do produto.
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "categories",
        required: true,
        index: true,
    },

    // Indica se o produto pode ser comercializado.
    isActive: {
        type: Boolean,
        default: true,
    },

    // Data de exclusão lógica (soft delete).
    deletedAt: {
        type: Date,
        default: null,
    },
}, {
    timestamps: true,
});

// SKU único por tenant considerando apenas produtos não excluídos.
productsSchema.index(
    { tenantId: 1, sku: 1 },
    { unique: true, partialFilterExpression: { deletedAt: null } }
);

export default mongoose.model("products", productsSchema);
