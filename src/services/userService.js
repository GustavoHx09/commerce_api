import bcrypt from "bcrypt";
import {
    createUserRepo,
    getUsersRepo,
    getUserByIdRepo,
    updateUserRepo,
    deleteUserRepo
} from "../repositories/userRepo.js";
import users from "../models/usersModel.js";

export const createUserService = async (data) => {

    // se caso o campo vier vazio OU faltando ele NÃO salva
    if (data.name === "" || !data.name) {
        const error = new Error("Campo 'name' não foi definido ou está faltando!");
        error.statusCode = 400;
        throw error;
    } if (data.email === "" || !data.email) {
        const error = new Error("Campo 'email' não foi definido ou está faltando!");
        error.statusCode = 400;
        throw error;
    } if (data.password && data.password.length >= 6) {
        const hashedPassword = await bcrypt.hash(data.password, 10);
        data.pass = hashedPassword;
    } else {
        const error = new Error("Campo 'password' deve conter no mínimo 6 caracteres!");
        error.statusCode = 400;
        throw error;
    } if (data.profile === "") {
        data.profile = "user";
    } else if (!data.profile) {
        const error = new Error("Campo 'profile' faltando!");
        error.statusCode = 400;
        throw error;
    }

    return await createUserRepo(data);
};

export const getUsersService = async () => {
    // regra de negócio
    return await getUsersRepo();
};

export const getUserByIdService = async (id) => {
    // regra de negócio
    return await getUserByIdRepo(id);
};

export const updateUserService = async (id, data) => {

    // busca usuário atual
    const user = await users.findById(id);

    // se caso o campo vier vazio ele NÃO altera
    if (data.name === "") {
        delete data.name;
    } else if (data.name === user.name) {
        delete data.name;
    }
    if (data.email === "") {
        delete data.email;
    } else if (data.email === user.email) {
        delete data.email;
    }
    if (data.password && data.password.length >= 6) {
        const isMatch = await bcrypt.compare(data.password, user.password);
        
        if (isMatch) {
            // mesma senha -> não atualiza
            delete data.password;
        } else {
            // senha nova → criptografa
            data.password = await bcrypt.hash(data.password, 10);
        }
    } else if (data.password < 6) {
        throw {
            statusCode: 400,
            message: "A senha deve ter no mínimo 6 caracteres"
        }
    } else {
        delete data.password;
    }
    if (data.profile === user.profile) {
        delete data.profile;
    } else if (data.profile === "") {
        delete data.profile;
    }

    if (Object.keys(data).length === 0) {
        throw {
            statusCode: 400,
            message: "Nenhum campo válido para atualização"
        }
    }

    return await updateUserRepo(id, data);
};

export const deleteUserService = async (id) => {
    // regra de negócio
    return await deleteUserRepo(id);
};