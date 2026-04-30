import mongoose from "mongoose";

const usersSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },

    phone: {
        type: String,
        trim: true,
        required: false,
        match: [/^\d{10,11}$/, 'Telefone inválido']
    },

    cpf: {
        type: String,
        unique: true,
        required: true,
        trim: true,
        match: [/^\d{11}$/, 'CPF deve conter 11 números']
    },

    address: {
        street: String,
        number: String,
        city: { type: String, required: true },
        state: { type: String, required: true },
        zipCode: {
            type: String,
            match: /^[0-9]{5}-?[0-9]{3}$/
        },
        complement: String
    },

    email: {
        type: String,
        sparse: true,
        lowercase: true,
        trim: true,
        match: /\S+@\S+\.\S+/
    },

    password: {
        type: String,
        required: true,
        minlength: 6,
        select: false
    },

    profile: {
        type: String,
        enum: ['admin', 'user', 'client'],
        default: 'client'
    },

    status: {
        type: Boolean,
        default: true
    }

}, {
    // para atualizar no banco o momento da requisição
    timestamps: true
});
// cria coleção de usuarios no banco de dados
export default mongoose.model('User', usersSchema);