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

    // DSN opcional usado para enviar erros da API ao Sentry.
    get sentryDsn() {
        return process.env.SENTRY_DSN;
    },

    // Tempo de duração da sessão JWT armazenada no cookie.
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

    // Chave da API do Resend para envio de emails transacionais.
    // Sem ela configurada, os envios são ignorados (estrutura pronta, envio desabilitado).
    get resendApiKey() {
        return process.env.RESEND_API_KEY;
    },

    // Remetente usado nos emails transacionais (ex: "Commerce API <noreply@dominio.com>").
    get emailFrom() {
        return process.env.EMAIL_FROM || "onboarding@resend.dev";
    },

    // URL base do frontend, usada para montar o link de recuperação de senha.
    get webUrl() {
        return process.env.WEB_URL || process.env.CORS_URL?.split(",")[0]?.trim() || "http://localhost:3000";
    },

    // Object storage compatível com S3 (AWS S3, Cloudflare R2 ou MinIO) para uploads.
    // Quando as três variáveis obrigatórias estão vazias, os uploads caem no disco local.
    get s3Bucket() {
        return process.env.S3_BUCKET;
    },
    get s3Region() {
        return process.env.S3_REGION || "auto";
    },
    get s3Endpoint() {
        return process.env.S3_ENDPOINT;
    },
    get s3AccessKeyId() {
        return process.env.S3_ACCESS_KEY_ID;
    },
    get s3SecretAccessKey() {
        return process.env.S3_SECRET_ACCESS_KEY;
    },

    // URL pública base do bucket usada para montar o link dos arquivos enviados.
    get s3PublicUrl() {
        return process.env.S3_PUBLIC_URL;
    },
};
