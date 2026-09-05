import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
    street: { type: String, trim: true },
    number: { type: String, trim: true },
    complement: { type: String, trim: true },
    neighborhood: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    zipCode: { type: String, trim: true },
}, { _id: false });

// Modelo de tenant/empresa com dados comerciais completos e soft delete.
const tenantsSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },

    // Identificador único gerado automaticamente a partir do nome.
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },

    // Documento fiscal da empresa (CPF ou CNPJ). Único entre tenants ativos.
    document: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },

    // Tipo do documento para saber qual validação aplicar.
    documentType: {
        type: String,
        enum: ["cpf", "cnpj"],
        required: true,
    },

    // Telefone comercial.
    phone: {
        type: String,
        required: true,
        trim: true,
    },

    // Email comercial.
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
    },

    // Endereço da empresa.
    address: {
        type: addressSchema,
        default: {},
    },

    // URL do logotipo da empresa.
    logoUrl: {
        type: String,
        trim: true,
    },

    // Configurações internas da empresa. Não retornado por padrão.
    settings: {
        timezone: { type: String, default: "America/Sao_Paulo" },
        currency: { type: String, default: "BRL" },
        fiscalMode: { type: String, enum: ["none", "nfce", "nfe"], default: "none" },
    },

    // Plano contratado. Limita recursos como quantidade de usuários.
    plan: {
        type: String,
        enum: ["free", "basic", "pro"],
        default: "free",
    },

    // Limite de usuários da empresa baseado no plano.
    maxUsers: {
        type: Number,
        default: function () {
            const planLimits = { free: 2, basic: 10, pro: 100 };
            return planLimits[this.plan] ?? planLimits.free;
        },
    },

    // Indica se o tenant está ativo no sistema.
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

export default mongoose.model('tenants', tenantsSchema);
