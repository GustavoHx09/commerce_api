import {
    createUserService,
    getUsersService,
    getUserByIdService,
    updateUserService,
    softDeleteUserService,
    hardDeleteUserService,
} from "../services/userService.js";
import { successResponse } from "../utils/responseHelpers.js";
import { ensureFound } from "../utils/controllerHelpers.js";

// Cria um novo usuário vinculado ao tenant do usuário autenticado.
export const createUser = async (req, res) => {
    const user = await createUserService(req.body, req.user);
    return successResponse(res, { user }, "Usuário criado com sucesso", 201);
};

// Lista usuários do tenant atual com paginação e filtros.
export const getUsers = async (req, res) => {
    const includeDeleted = req.user.role === "master" && req.query.includeDeleted === "true";
    const result = await getUsersService(req.query, req.tenantId, includeDeleted);
    return successResponse(res, result, "Usuários listados com sucesso");
};

// Busca um usuário específico pelo ID dentro do tenant atual.
export const getUserById = async (req, res) => {
    const includeDeleted = req.user.role === "master" && req.query.includeDeleted === "true";
    const user = await getUserByIdService(req.params.id, req.tenantId, includeDeleted);
    ensureFound(user, "Usuário");
    return successResponse(res, { user }, "Usuário encontrado com sucesso");
};

// Atualiza os dados de um usuário existente.
export const updateUser = async (req, res) => {
    const user = await updateUserService(req.params.id, req.body, req.user);
    return successResponse(res, { user }, "Usuário atualizado com sucesso");
};

// Realiza soft delete de um usuário do tenant atual.
export const softDeleteUser = async (req, res) => {
    await softDeleteUserService(req.params.id, req.user);
    return successResponse(res, null, "Usuário removido com sucesso");
};

// Realiza hard delete permanente de um usuário. Restrito a master.
export const hardDeleteUser = async (req, res) => {
    await hardDeleteUserService(req.params.id, req.user);
    return successResponse(res, null, "Usuário deletado permanentemente");
};
