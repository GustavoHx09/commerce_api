import {
    authenticateUser,
    refreshAccessToken,
    revokeRefreshTokenByToken,
} from "../services/authService.js";
import { successResponse } from "../utils/responseHelpers.js";

// Nome do cookie que armazena o refresh token no navegador.
const REFRESH_TOKEN_COOKIE = "refreshToken";

// Configura o cookie do refresh token com as flags de segurança.
const setRefreshTokenCookie = (res, token) => {
    res.cookie(REFRESH_TOKEN_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
        path: "/api/v1/auth",
    });
};

// Remove o cookie do refresh token no navegador.
const clearRefreshTokenCookie = (res) => {
    res.clearCookie(REFRESH_TOKEN_COOKIE, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/api/v1/auth",
    });
};

// Autentica o usuário e inicia a sessão retornando access token e refresh token em cookie.
export const login = async (req, res) => {
    const { email, password } = req.body;

    const { user, accessToken, refreshToken } = await authenticateUser(email, password);

    setRefreshTokenCookie(res, refreshToken);

    return successResponse(res, { user, accessToken }, "Login realizado com sucesso");
};

// Renova o access token a partir do refresh token enviado no cookie.
export const refresh = async (req, res) => {
    const token = req.cookies[REFRESH_TOKEN_COOKIE];

    const { accessToken, user } = await refreshAccessToken(token);

    return successResponse(res, { accessToken, user }, "Token renovado com sucesso");
};

// Encerra a sessão invalidando o refresh token e removendo o cookie.
export const logout = async (req, res) => {
    const token = req.cookies[REFRESH_TOKEN_COOKIE];

    if (token) {
        await revokeRefreshTokenByToken(token);
    }

    clearRefreshTokenCookie(res);

    return successResponse(res, null, "Logout realizado com sucesso");
};
