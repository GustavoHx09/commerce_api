import mongoose from "mongoose";

// Registro de auditoria para rastrear quem alterou o quê, quando e como.
const auditSchema = new mongoose.Schema({
    // Tipo da entidade alterada (ex: tenant, user, product).
    entityType: {
        type: String,
        required: true,
        trim: true,
    },

    // ID da entidade alterada.
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },

    // Tenant ao qual a entidade pertence, quando houver.
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "tenants",
        default: null,
    },

    // Ação realizada: create, update, delete ou restore.
    action: {
        type: String,
        enum: ["create", "update", "delete", "restore"],
        required: true,
    },

    // ID do usuário que realizou a ação.
    actorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true,
    },

    // Mudanças registradas. Para create/delete pode ser o documento completo; para update, apenas delta.
    changes: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
    },

    // Snapshot do documento após a ação. Opcional, mas útil para reconstrução futura.
    snapshot: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
    },
}, {
    timestamps: true,
});

export default mongoose.model('audit', auditSchema);
