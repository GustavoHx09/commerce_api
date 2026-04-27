import dotenv from "dotenv";
import app from "./src/app.js";
import { connectDB } from "./src/config/connectDB.js";

dotenv.config();

const PORT = 3001;

connectDB();

app.listen(PORT, () => {
    console.log('O servidor está rodando na porta', PORT)
});
