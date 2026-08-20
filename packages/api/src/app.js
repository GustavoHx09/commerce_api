import express from "express";
import routes from "./routes/index.js";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/connectDB.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
    cors({
        origin: [
            "https://desafio-minhafabrica-frontend.vercel.app",
            "http://localhost:3000",

        ]
    })
);

app.use(express.json());

// aqui eu centralizo todas as rotas...
app.use('/api/v1', routes);

connectDB();

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

export default app;