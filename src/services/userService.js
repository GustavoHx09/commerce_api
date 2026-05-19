import bcrypt from "bcrypt";
import users from "../models/usersModel.js";
import {
    createUserRepo,
    getUsersRepo,
    getUserByIdRepo,
    updateUserRepo,
    deleteUserRepo
} from "../repositories/userRepo.js";
import { isEmpty, isValid } from "../validators/validateFields.js";
import { userResponse } from "../formatters/userFormatter.js";
import { emailExists } from "../validators/emailExist.js";
import { cpfExists } from "../validators/cpfExist.js";
import { isValidCPF } from "../utils/cpfIsValid.js";
import { isValidPhone } from "../validators/phoneIsValid.js";


/* /////////////////////////

    Cria o usuario

///////////////////////// */
export const createUserService = async (data, currentUser) => {

    // validação do nome
    if (isEmpty(data.name)) {
        throw {
            statusCode: 400,
            message: "Campo 'name' não foi definido ou está faltando!"
        }
    }

    // validação do cpf
    if (isEmpty(data.cpf)) {
        throw {
            statusCode: 400,
            message: "Campo 'cpf' não pode ser vazio"
        }
    } else if (!isValidCPF(data.cpf)) {
        throw {
            statusCode: 400,
            message: "Campo 'cpf' DEVE ser válido!"
        }
    } else {
        // confere se ja existe o mesmo cpf cadastrado
        await cpfExists(data.cpf);
    }

    // validação do campo address
    if (data.address) {

        // street
        if (isEmpty(data.address.street)) {
            data.address.street = null;
        }

        // number
        if (isEmpty(data.address.number)) {
            data.address.number = null;
        }

        // city (obrigatório)
        if (isEmpty(data.address.city)) {
            throw {
                statusCode: 400,
                message: "Campo 'city' não foi definido ou está faltando!"
            };
        }

        // state (obrigatório)
        if (isEmpty(data.address.state)) {
            throw {
                statusCode: 400,
                message: "Campo 'state' não foi definido ou está faltando!"
            };
        }

        // zipCode
        if (isEmpty(data.address.zipCode)) {
            data.address.zipCode = null;
        } else if (!/^[0-9]{5}-?[0-9]{3}$/.test(data.address.zipCode)) {
            throw {
                statusCode: 400,
                message: "CEP inválido"
            };
        }

        // complement
        if (isEmpty(data.address.complement)) {
            data.address.complement = null;
        }

    } else {
        throw {
            statusCode: 400,
            message: "Campo address{ state | city } são obrigatórios!"
        };
    }

    // validação do telefone
    if (isEmpty(data.phone)) {
        data.phone = null;
    } else if (!isValidPhone(data.phone)) {
        throw {
            statusCode: 400,
            message: "Telefone inválido"
        };
    }

    // validação do email
    if (isEmpty(data.email)) {
        data.email = null;
    } else if (data.email) {
        // confere se ja existe o mesmo email cadastrado
        await emailExists(data.email);
    }

    // validação da senha
    if (data.password && data.password.length >= 6) {
        const hashedPassword = await bcrypt.hash(data.password, 10);

        data.password = hashedPassword;
    } else {
        throw {
            statusCode: 400,
            message: "Campo 'password' deve conter no mínimo 6 caracteres!"
        }
    }

    if (isEmpty(data.profile)) {
        delete data.profile;
    } else if (data.profile === "adminmaster" && currentUser.profile !== "adminmaster") {
        throw {
            statusCode: 403,
            message: "Você não tem permissão para isso!"
        };
    } else if (data.profile === "admin" && currentUser.profile !== "admin" && currentUser.profile !== "adminmaster") {
        throw {
            statusCode: 403,
            message: "Você não tem permissão para isso."
        };
    }

    return await createUserRepo(data);
};


/* /////////////////////////

    Busca os usuários 

///////////////////////// */
export const getUsersService = async (query) => {
    const filter = {};

    // status
    if (query.status !== undefined) {
        filter.status = query.status === "true";
    }

    // profile
    if (query.profile) {
        filter.profile = query.profile;
    }

    const users = await getUsersRepo(filter);

    // exibe os dados de forma organizada
    return users.map(userResponse);
};


/* /////////////////////////

   Busca o usuário pelo ID 

///////////////////////// */
export const getUserByIdService = async (id) => {
    return await getUserByIdRepo(id);
};


/* /////////////////////////

    Atualiza o usuario 

///////////////////////// */
export const updateUserService = async (id, data, currentUser) => {

    // busca o usuário a ser editado
    const user = await users
        .findById(id)
        .select("+password");

    // valida nome
    if (isValid(data.name, user.name)) {
        delete data.name;
    }

    // valida telefone
    if (isValid(data.phone, user.phone)) {
        delete data.phone;
    } else if (!isValidPhone(data.phone)) {
        throw {
            statusCode: 400,
            message: "Telefone inválido"
        };
    }

    // valida cpf
    if (isValid(data.cpf, user.cpf)) {
        delete data.cpf;
    } else if (!isValidCPF(data.cpf)) {
        throw {
            statusCode: 400,
            message: "Campo 'cpf' DEVE ser válido!"
        }
    } else {
        // faz verificação do cpf
        await cpfExists(data.cpf);
    }

    // valida endereço
    if (data.address) {

        // rua
        if (isValid(data.address.street, user.address?.street)) {
            delete data.address.street;
        } 

        // numero
        if (isValid(data.address.number, user.address?.number)) {
            delete data.address.number;
        }

        // cidade (obrigatório)
        if (isValid(data.address.city, user.address?.city)) {
            delete data.address.city;
        } 

        // estado (obrigatório)
        if (isValid(data.address.state, user.address?.state)) {
            delete data.address.state;
        }

        // cep
        if (isValid(data.address.zipCode, user.address?.zipCode)) {
            delete data.address.zipCode;
        } else if (!/^[0-9]{5}-?[0-9]{3}$/.test(data.address.zipCode)) {
            throw {
                statusCode: 400,
                message: "CEP inválido"
            };
        }

        // complemento
        if (isValid(data.address.complement, user.address?.complement)) {
            delete data.address.complement;
        }

        // se n tiver nada, remove o address inteiro
        if (Object.keys(data.address).length === 0) {
            delete data.address;
        }
    }

    // valida email
    if (isValid(data.email, user.email)) {
        delete data.email;
    } else if (data.email) {
        // confere se ja existe o mesmo email cadastrado
        await emailExists(data.email);
    }

    // valida senha
    if (data.password && data.password.length >= 6) {

        const isMatch = await bcrypt.compare(data.password, user.password);

        if (isMatch) {
            // mesma senha -> não atualiza
            delete data.password;
        } else {
            // senha nova → criptografa
            data.password = await bcrypt.hash(data.password, 10);
        }
    } else if (isEmpty(data.password)) {
        delete data.password;
    } else if (data.password < 6) {
        throw {
            statusCode: 400,
            message: "A senha deve ter no mínimo 6 caracteres"
        }
    }

    // valida perfil
    if (isValid(data.profile, user.profile)) {
        delete data.profile;
    } else if (data.profile === "adminmaster" && currentUser.profile !== "adminmaster") {
        throw {
            statusCode: 403,
            message: "Você não tem essa permissão!"
        };
    } else if (data.profile !== undefined && currentUser.profile !== "admin" && currentUser.profile !== "adminmaster") {
        throw {
            statusCode: 403,
            message: "Você não tem permissão para alterar o perfil do usuário"
        };
    }

    // valida empresa
    if (isValid(data.company, user.company)) {
        delete data.company;
    } else if (data.company) {
        if (data.company !== undefined && currentUser.profile !== "adminmaster") {
            throw {
                statusCode: 403,
                message: "Você não tem permissão para alterar a empresa dos usuários"
            };
        }
    }

    // valida status
    if (isValid(data.status, user.status)) {
        delete data.status;
    } else if (data.status) {
        if (user.profile === "adminmaster" && currentUser.profile !== "adminmaster") {
            throw {
                statusCode: 403,
                message: "Você não tem permissão para alterar o status deste usuário"
            };
        } else if (data.status !== undefined && currentUser.profile !== "admin" && currentUser.profile !== "adminmaster") {
            throw {
                statusCode: 403,
                message: "Você não tem permissão para alterar o status do usuário"
            };
        }
    }

    if (Object.keys(data).length === 0) {
        throw {
            statusCode: 400,
            message: "Nenhum campo válido para atualização"
        }
    }

    return await updateUserRepo(id, data);
};


/* /////////////////////////

    Deleta o usuario 

///////////////////////// */
export const deleteUserService = async (id, currentUser) => {
    const user = await users.findById(id);

    if (user.profile === "adminmaster" && currentUser.profile !== "adminmaster") {
        throw {
            statusCode: 403,
            message: "Você não tem permissão para excluir este usuário"
        }
    } else if (user.profile === "admin" && currentUser.profile !== "admin" && currentUser.profile !== "adminmaster") {
        throw {
            statusCode: 403,
            message: "Você não tem permissão para excluir este usuário"
        }
    } else if (user) {
        return await deleteUserRepo(id);
    } else {
        throw {
            statusCode: 400,
            message: "O usuário não existe ou já foi deletado!"
        }
    }

};