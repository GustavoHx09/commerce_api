import mongoose from "mongoose";

// Categoria de produtos, isolada por tenant, com suporte a soft delete.
const categorySchema = new mongoose.Schema({
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
        trim: true,
        default: "",
    },

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

// Nome de categoria único por tenant e não excluído.
categorySchema.index(
    { tenantId: 1, name: 1 },
    { unique: true, partialFilterExpression: { deletedAt: null } }
);

export default mongoose.model("categories", categorySchema);
