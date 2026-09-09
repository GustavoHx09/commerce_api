import mongoose from "mongoose";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uriFile = path.join(__dirname, ".mongo-test-uri");

// Lê o URI do replica set em memória criado pelo globalSetup e conecta o Mongoose
// no processo dos testes. Isso é necessário porque o globalSetup roda em processo separado.
const uri = await fs.readFile(uriFile, "utf8");
process.env.MONGO_URI = uri;
process.env.MONGO_URI_TEST = uri;

if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    console.log(`[test setup] Conectado a ${uri}`);
}

// Limpa o banco antes de cada arquivo de teste para garantir isolamento entre suites.
await mongoose.connection.db.dropDatabase();
console.log("[test setup] Banco de testes limpo");
