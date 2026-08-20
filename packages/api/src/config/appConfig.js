export const appConfig = {
    get port() {
        return process.env.PORT || 3001;
    },
    get jwtSecret() {
        return process.env.JWT_SECRET;
    },
    get jwtExpiresIn() {
        return process.env.JWT_EXPIRES_IN || "7d";
    },
    get corsUrl() {
        return process.env.CORS_URL || "http://localhost:3000";
    },
    get nodeEnv() {
        return process.env.NODE_ENV || "development";
    },
    get masterEmail() {
        return process.env.MASTER_EMAIL;
    },
    get masterPassword() {
        return process.env.MASTER_PASSWORD;
    },
};
