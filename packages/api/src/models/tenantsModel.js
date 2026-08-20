import mongoose from "mongoose";

// Modelo de tenant com slug único usado para identificação e URL.
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

    // Indica se o tenant está ativo no sistema.
    isActive: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
});

export default mongoose.model('tenants', tenantsSchema);
