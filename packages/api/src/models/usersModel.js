import mongoose from "mongoose";

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

    password: {
        type: String,
        required: true,
        minlength: 6,
        select: false,
    },

    role: {
        type: String,
        enum: ['master', 'admin', 'user'],
        default: 'user',
    },

    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'tenants',
        default: null,
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

export default mongoose.model('users', usersSchema);
