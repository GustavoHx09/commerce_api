import express from "express";
import routes from "./routes/index.js";
import cors from "cors";

const app = express();

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

export default app;