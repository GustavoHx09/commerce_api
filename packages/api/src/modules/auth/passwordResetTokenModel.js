import mongoose from "mongoose";

// Registro de tokens de recuperação de senha. O token em si nunca é salvo;
// apenas o hash SHA-256, seguindo o mesmo padrão da blacklist de sessões.
const passwordResetTokenSchema = new mongoose.Schema({
    tokenHash: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },

    // Usuário que solicitou a recuperação de senha.
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true,
        index: true,
    },

    // Tenant do usuário, mantido para auditoria e consistência multitenancy.
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'tenants',
        default: null,
    },

    // Data de expiração do token. Após ela, o token não pode ser usado.
    expiresAt: {
        type: Date,
        required: true,
    },

    // Marca quando o token foi consumido. Tokens são de uso único.
    usedAt: {
        type: Date,
        default: null,
    },
}, {
    timestamps: true,
});

// Índice TTL que remove tokens expirados automaticamente do banco.
passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('passwordResetTokens', passwordResetTokenSchema);
