import mongoose from "mongoose";

const companySchema = new mongoose.Schema({
    corporateName: {
        type: String,
        required: true,
        trim: true
    },

    fantasyName: {
        type: String,
        trim: true
    },

    phone: {
        type: String,
        trim: true,
        match: [/^\d{10,11}$/, 'Telefone inválido']
    },

    cnpj: {
        type: String,
        unique: true,
        required: true,
        trim: true
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

    status: {
        type: Boolean,
        default: true
    }

}, {
    // para atualizar no banco o momento da requisição
    timestamps: true
});
// cria coleção de usuarios no banco de dados
export default mongoose.model('Company', companySchema);