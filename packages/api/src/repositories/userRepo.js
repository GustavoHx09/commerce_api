import users from "../models/usersModel.js";
import { baseQuery } from "../utils/repositoryHelpers.js";

// Cria um novo usuário no banco de dados.
export const createUserRepo = (data) => users.create(data);

// Retorna uma lista paginada de usuários com base no filtro.
export const getUsersRepo = (filter, skip, limit, sort) => {
    return users.find(filter).skip(skip).limit(limit).sort(sort);
};

// Conta o total de usuários que satisfazem o filtro.
export const countUsersRepo = (filter) => users.countDocuments(filter);

// Busca um usuário pelo ID dentro do tenant e considerando soft delete.
export const getUserByIdRepo = (id, tenantId, includeDeleted = false) => {
    return users.findOne({ _id: id, ...baseQuery(tenantId, includeDeleted) });
};

// Busca um usuário pelo ID incluindo o campo password para validação.
export const getUserByIdWithPasswordRepo = (id, tenantId, includeDeleted = false) => {
    return users.findOne({ _id: id, ...baseQuery(tenantId, includeDeleted) }).select("+password");
};

// Atualiza um usuário do tenant e retorna o documento atualizado.
export const updateUserRepo = (id, data, tenantId) => {
    return users.findOneAndUpdate(
        { _id: id, ...baseQuery(tenantId, false) },
        data,
        { new: true }
    );
};

// Realiza soft delete de um usuário do tenant, definindo deletedAt.
export const softDeleteUserRepo = (id, tenantId) => {
    return users.findOneAndUpdate(
        { _id: id, ...baseQuery(tenantId, false) },
        { deletedAt: new Date() },
        { new: true }
    );
};

// Remove permanentemente um usuário do banco de dados.
export const hardDeleteUserRepo = (id) => {
    return users.findByIdAndDelete(id);
};
