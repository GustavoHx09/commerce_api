import mongoose from "mongoose";

// Cria a conexão com o MongoDB usando a URI definida em variável de ambiente.
export const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Conectado ao MongoDB')
    } catch (error) {
        console.log('Erro ao conectar ao MongoDB', error);
    }
};
