import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import users from "../models/usersModel.js";
import { appConfig } from "../config/appConfig.js";

// Gera um access token JWT curto com os dados principais do usuário.
const generateAccessToken = (user) => {
    return jwt.sign(
        {
            id: user._id,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
        },
        appConfig.jwtSecret,
        appConfig.jwtExpiresIn ? { expiresIn: appConfig.jwtExpiresIn } : undefined
    );
};

// Gera um refresh token JWT longo usado apenas para renovar o access token.
const generateRefreshToken = (user) => {
    return jwt.sign(
        { id: user._id },
        appConfig.jwtSecret,
        { expiresIn: "7d" }
    );
};

// Valida email e senha, gera tokens e armazena o hash do refresh token no banco.
export const authenticateUser = async (email, password) => {
    const user = await users
        .findOne({ email: email?.toLowerCase(), deletedAt: null })
        .select("+password");

    if (!user) {
        const error = new Error("Credenciais inválidas");
        error.statusCode = 401;
        throw error;
    }

    if (!user.isActive) {
        const error = new Error("Usuário inativo");
        error.statusCode = 403;
        throw error;
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        const error = new Error("Credenciais inválidas");
        error.statusCode = 401;
        throw error;
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    await users.findByIdAndUpdate(user._id, { refreshToken: hashedRefreshToken });

    return {
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
        },
        accessToken,
        refreshToken,
    };
};

// Valida o refresh token e emite um novo access token.
export const refreshAccessToken = async (token) => {
    if (!token) {
        const error = new Error("Refresh token não fornecido");
        error.statusCode = 401;
        throw error;
    }

    let decoded;

    try {
        decoded = jwt.verify(token, appConfig.jwtSecret);
    } catch {
        const error = new Error("Refresh token inválido");
        error.statusCode = 401;
        throw error;
    }

    const user = await users.findById(decoded.id).select("+refreshToken");

    if (!user || !user.refreshToken) {
        const error = new Error("Refresh token inválido");
        error.statusCode = 401;
        throw error;
    }

    const isMatch = await bcrypt.compare(token, user.refreshToken);

    if (!isMatch) {
        const error = new Error("Refresh token inválido");
        error.statusCode = 401;
        throw error;
    }

    const accessToken = generateAccessToken(user);

    return {
        accessToken,
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
        },
    };
};

// Invalida o refresh token do usuário, efetivamente encerrando a sessão.
export const revokeRefreshToken = async (userId) => {
    await users.findByIdAndUpdate(userId, { refreshToken: null });
};

// Decodifica o payload de um token JWT sem verificar a assinatura.
// Usado apenas para extrair o ID do usuário em operações de logout.
const decodeTokenPayload = (token) => {
    try {
        return JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
    } catch {
        return null;
    }
};

// Invalida o refresh token a partir do próprio token JWT.
export const revokeRefreshTokenByToken = async (token) => {
    const decoded = decodeTokenPayload(token);

    if (decoded?.id) {
        await revokeRefreshToken(decoded.id);
    }
};
