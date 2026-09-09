import mongoose from "mongoose";

// Registro de tokens JWT revogados. O token em si não é salvo; apenas o hash SHA-256.
const tokenBlacklistSchema = new mongoose.Schema({
    tokenHash: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    expiresAt: {
        type: Date,
        required: true,
    },
}, {
    timestamps: true,
});

// Índice TTL que remove registros automaticamente após a data de expiração.
tokenBlacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('tokenBlacklist', tokenBlacklistSchema);
