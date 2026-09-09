import mongoose from "mongoose";

// Modelo de usuário com suporte a múltiplos roles, vinculação a tenant e soft delete.
const usersSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: /\S+@\S+\.\S+/,
    },

    cpf: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },

    phone: {
        type: String,
        required: true,
        trim: true,
    },

    address: {
        street: { type: String, trim: true },
        number: { type: String, trim: true },
        complement: { type: String, trim: true },
        neighborhood: { type: String, trim: true },
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        zipCode: { type: String, trim: true },
    },

    // Senha criptografada. Não é retornada em consultas por padrão.
    password: {
        type: String,
        required: true,
        minlength: 6,
        select: false,
    },

    // Papel do usuário no sistema: master, admin ou user.
    role: {
        type: String,
        enum: ['master', 'admin', 'user'],
        default: 'user',
    },

    // Tenant ao qual o usuário pertece. Null para usuários master.
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'tenants',
        default: null,
    },

    // Preset de permissões vinculado. Mudar o preset afeta todos os usuários vinculados.
    permissionPresetId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'permissionPresets',
        default: null,
    },

    // Permissões extras manuais (aditivas sobre o preset ou role default).
    permissions: {
        type: [String],
        default: [],
    },

    // Permissões revogadas individualmente (subtrativas).
    revokedPermissions: {
        type: [String],
        default: [],
    },

    // Marca a última troca de senha. Tokens JWT emitidos antes desta data são revogados.
    passwordChangedAt: {
        type: Date,
        default: null,
    },

    // Indica se o usuário está ativo no sistema.
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

export default mongoose.model('users', usersSchema);
