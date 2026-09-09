// Ponto de entrada da aplicação em produção/desenvolvimento.
// Separa a criação do app Express da inicialização do servidor e do banco,
// permitindo que testes importem `app` sem iniciar uma porta nem conectar duas vezes.
import dotenv from "dotenv";
import app from "./app.js";
import { connectDB } from "./shared/config/connectDB.js";
import { appConfig } from "./shared/config/appConfig.js";

// Carrega variáveis de ambiente antes de conectar ao banco.
dotenv.config();

// Conecta ao MongoDB e inicia o servidor.
connectDB().then(() => {
    app.listen(appConfig.port, () => {
        console.log(`API rodando na porta http://localhost:${appConfig.port}`);
    });
});
