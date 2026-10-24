import mongoose from "mongoose";

// Intervalo entre tentativas de conexão quando o MongoDB ainda não está disponível.
// Evita que a API fique inoperante quando sobe antes do banco (ex: Docker inicializando).
const RETRY_INTERVAL_MS = 5000;

// Cria a conexão com o MongoDB usando a URI definida em variável de ambiente.
// Em caso de falha, agenda uma nova tentativa até conseguir conectar.
export const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Conectado ao MongoDB');
    } catch (error) {
        console.log(`Erro ao conectar ao MongoDB. Nova tentativa em ${RETRY_INTERVAL_MS / 1000}s...`, error.message);
        setTimeout(connectDB, RETRY_INTERVAL_MS);
    }
};

// Registra quedas de conexão após o primeiro connect bem-sucedido.
// O próprio Mongoose tenta reconectar automaticamente; o log apenas sinaliza a indisponibilidade.
mongoose.connection.on("disconnected", () => {
    console.log("Conexão com o MongoDB perdida. Tentando reconectar...");
});
