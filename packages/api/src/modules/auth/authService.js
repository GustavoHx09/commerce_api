import jwt from "jsonwebtoken";
import crypto from "crypto";
import bcrypt from "bcrypt";
import users from "../user/userModel.js";
import { appConfig } from "../../shared/config/appConfig.js";
import { addToBlacklistRepo, isTokenBlacklistedRepo } from "./tokenBlacklistRepo.js";

// Gera o JWT de sessão enviado exclusivamente pelo cookie HttpOnly.
const generateSessionToken = (user) => {
    return jwt.sign(
        {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
        },
        appConfig.jwtSecret,
        { expiresIn: appConfig.jwtExpiresIn }
    );
};

// Valida email e senha e retorna os dados necessários para iniciar a sessão.
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

    return {
        token: generateSessionToken(user),
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
        },
    };
};

// Gera o hash SHA-256 de um token para armazenar na blacklist sem expor o valor.
export const hashToken = (token) => {
    return crypto.createHash("sha256").update(token).digest("hex");
};

// Verifica se o token informado foi revogado.
export const isTokenRevoked = async (token) => {
    const tokenHash = hashToken(token);
    const blacklisted = await isTokenBlacklistedRepo(tokenHash);
    return !!blacklisted;
};

// Revoga um token válido adicionando-o à blacklist.
export const revokeToken = async (token) => {
    const decoded = jwt.verify(token, appConfig.jwtSecret);
    const tokenHash = hashToken(token);
    const expiresAt = new Date(decoded.exp * 1000);

    await addToBlacklistRepo(tokenHash, expiresAt);
    return true;
};
