import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import users from "../models/usersModel.js";
import { appConfig } from "../config/appConfig.js";
import { successResponse, errorResponse } from "../utils/responseHelpers.js";

export const login = async (req, res) => {
    const { email, password } = req.body;

    const user = await users.findOne({ email: email?.toLowerCase(), deletedAt: null }).select("+password");

    if (!user) {
        return errorResponse(res, "Credenciais inválidas", 401);
    }

    if (!user.isActive) {
        return errorResponse(res, "Usuário inativo", 403);
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        return errorResponse(res, "Credenciais inválidas", 401);
    }

    const token = jwt.sign(
        {
            id: user._id,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
        },
        appConfig.jwtSecret,
        appConfig.jwtExpiresIn ? { expiresIn: appConfig.jwtExpiresIn } : undefined
    );

    return successResponse(res, { token }, "Login realizado com sucesso");
};
