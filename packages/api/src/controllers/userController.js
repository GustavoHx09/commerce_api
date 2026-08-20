import {
    createUserService,
    getUsersService,
    getUserByIdService,
    updateUserService,
    softDeleteUserService,
    hardDeleteUserService,
} from "../services/userService.js";
import { successResponse } from "../utils/responseHelpers.js";

export const createUser = async (req, res) => {
    const user = await createUserService(req.body, req.user);
    return successResponse(res, { user }, "Usuário criado com sucesso", 201);
};

export const getUsers = async (req, res) => {
    const includeDeleted = req.user.role === "master" && req.query.includeDeleted === "true";
    const result = await getUsersService(req.query, req.tenantId, includeDeleted);
    return successResponse(res, result, "Usuários listados com sucesso");
};

export const getUserById = async (req, res) => {
    const includeDeleted = req.user.role === "master" && req.query.includeDeleted === "true";
    const user = await getUserByIdService(req.params.id, req.tenantId, includeDeleted);

    if (!user) {
        const error = new Error("Usuário não encontrado");
        error.statusCode = 404;
        throw error;
    }

    return successResponse(res, { user }, "Usuário encontrado com sucesso");
};

export const updateUser = async (req, res) => {
    const user = await updateUserService(req.params.id, req.body, req.user);
    return successResponse(res, { user }, "Usuário atualizado com sucesso");
};

export const softDeleteUser = async (req, res) => {
    await softDeleteUserService(req.params.id, req.user);
    return successResponse(res, null, "Usuário removido com sucesso");
};

export const hardDeleteUser = async (req, res) => {
    await hardDeleteUserService(req.params.id, req.user);
    return successResponse(res, null, "Usuário deletado permanentemente");
};
