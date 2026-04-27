import mongoose from "mongoose";

const usersSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: /\S+@\S+\.\S+/
    },

    password: {
        type: String,
        required: true,
        minlength: 6
    },

    profile: {
        type: String,
        enum: ['admin', 'user'],
        default: 'user'
    },

}, {
    // para atualizar no banco o momento da inquisição
    timestamps: true
});

export default mongoose.model('users', usersSchema);