import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uriFile = path.join(__dirname, ".mongo-test-uri");

// URI padrão para os testes de integração, esperando MongoDB local via Docker Compose.
// Pode ser sobrescrito pela variável de ambiente MONGO_URI_TEST.
const DEFAULT_TEST_URI = "mongodb://localhost:27017/commerce_api_test?replicaSet=rs0";

export default async function setup() {
    process.env.NODE_ENV = "test";
    process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-jwt";
    process.env.CORS_URL = process.env.CORS_URL || "http://localhost:3000";

    const uri = process.env.MONGO_URI_TEST || DEFAULT_TEST_URI;
    process.env.MONGO_URI = uri;
    process.env.MONGO_URI_TEST = uri;

    await fs.writeFile(uriFile, uri, "utf8");
    console.log(`[global setup] Usando MongoDB de testes: ${uri}`);

    return async function teardown() {
        try {
            await fs.unlink(uriFile);
        } catch {
            // Arquivo já pode ter sido removido; ignorar.
        }
    };
}
