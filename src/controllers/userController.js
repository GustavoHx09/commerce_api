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
        // tratamento para email duplicado
        if (error.code === 11000) {
            return res.status(400).json({
                message: "Email já cadastrado, por favor insira outro!"
            });
        } else {
            return res.status(error.statusCode || 500).json({
                message: error.message || "Erro ao criar usuário"
            });
        }
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
            { new: true }
        );

        return res.status(200).json({
            message: "Usuário atualizado com sucesso",
            user
        });

    } catch (error) {

        // email duplicado
        if (error.code === 11000) {
            return res.status(400).json({
                message: "Email já cadastrado, por favor insira outro!"
            });
        }

        // erro vindo do service (throw com statusCode)
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                message: error.message
            });
        }

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

        return res.status(200).json({
            message: "Usuário deletado com sucesso"
        });

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
        const user = await getUsersService();

        return res.status(200).json({
            message: "Usuários listado com sucesso",
            user
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