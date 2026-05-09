import {
    createUserService,
    getUsersService,
    getUserByIdService,
    updateUserService,
    deleteUserService
} from "../services/userService.js";

// Criar usuario
export const createUser = async (req, res) => {
    try {
        const data = req.body;

        const user = await createUserService(data);

        return res.status(201).json({
            message: "Usuário criado com sucesso",
            user
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            message: error.message || "Erro ao criar usuário"
        });
    }
};

// Atualizar usuario
export const updateUser = async (req, res) => {
    try {
        const id = req.params.id;
        const data = req.body;

        const user = await updateUserService(
            id,
            data,
            req.user
        );

        return res.status(200).json({
            message: "Usuário atualizado com sucesso",
            user
        });

    } catch (error) {
        // erro genérico
        return res.status(500).json({
            message: "Erro ao atualizar usuário",
            error: error.message
        });
    }
};

// Deletar usuario
export const deleteUser = async (req, res) => {
    try {
        const id = req.params.id;

        await deleteUserService(id);
    } catch (error) {
        return res.status(500).json({
            message: "Erro ao deletar usuário",
            error: error.message
        });
    }
};

// Buscar todos
export const getUsers = async (req, res) => {
    try {
        const users = await getUsersService(req.query);

        return res.status(200).json({
            message: "Usuários listado com sucesso",
            users
        });
    } catch (error) {
        return res.status(500).json({
            message: "Erro ao listar usuários",
            error: error.message
        });
    }
};

// Buscar por id
export const getUserById = async (req, res) => {
    try {
        const id = req.params.id;

        const user = await getUserByIdService(id);

        if (!user) {
            return res.status(404).json({
                message: "Usuário não encontrado"
            });
        }

        return res.status(200).json({
            message: "Usuário encontrado com sucesso",
            user
        });

    } catch (error) {
        return res.status(500).json({
            message: "Erro ao buscar usuário",
            error: error.message
        });
    }
};