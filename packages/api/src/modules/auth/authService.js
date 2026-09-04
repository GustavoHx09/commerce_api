import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import users from "../user/userModel.js";
import { appConfig } from "../../shared/config/appConfig.js";

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
