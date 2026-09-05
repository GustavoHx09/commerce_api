import mongoose from "mongoose";

// Preset reutilizável de permissões. Presets com tenantId null são globais e podem ser
// gerenciados apenas por masters; presets com tenantId pertencem a uma empresa.
const permissionPresetSchema = new mongoose.Schema({
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

    permissions: {
        type: [String],
        required: true,
        default: [],
    },

    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "tenants",
        default: null,
        index: true,
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

// Nome é único por tenant considerando apenas presets não excluídos (soft delete).
permissionPresetSchema.index(
    { tenantId: 1, name: 1 },
    { unique: true, partialFilterExpression: { deletedAt: null } }
);

export default mongoose.model("permissionPresets", permissionPresetSchema);
