// Centraliza o acesso às variáveis de ambiente da aplicação.
// Usa getters para garantir que os valores sejam lidos após o dotenv carregar o .env.
export const appConfig = {
    // Porta onde a API será executada.
    get port() {
        return process.env.PORT || 3001;
    },

    // Chave secreta usada para assinar os tokens JWT.
    get jwtSecret() {
        return process.env.JWT_SECRET;
    },

    // Tempo de expiração do access token JWT.
    get jwtExpiresIn() {
        return process.env.JWT_EXPIRES_IN || "7d";
    },

    // Origem permitida pelo CORS. Pode receber várias origens separadas por vírgula.
    get corsUrl() {
        return process.env.CORS_URL || "http://localhost:3000";
    },

    // Ambiente de execução da aplicação.
    get nodeEnv() {
        return process.env.NODE_ENV || "development";
    },

    // Email do usuário master criado automaticamente pelo seed.
    get masterEmail() {
        return process.env.MASTER_EMAIL;
    },

    // Senha do usuário master criado automaticamente pelo seed.
    get masterPassword() {
        return process.env.MASTER_PASSWORD;
    },
};
