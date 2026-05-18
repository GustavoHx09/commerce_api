import bcrypt from "bcrypt";
import company from "../models/companyModel.js";
import {
    createCompanyRepo,
    getCompanyRepo,
    getCompanyByIdRepo,
    updateCompanyRepo,
    deleteCompanyRepo
} from "../repositories/companyRepo.js";
import { userResponse } from "../formatters/userFormatter.js";
import { emailExists } from "../validators/emailExist.js";
import { cnpjExists } from "../validators/cnpjExist.js";
import { isValidCNPJ } from "../utils/cnpjIsValid.js";
import { isEmpty } from "../validators/isEmpty.js";

export const createCompanyService = async (data) => {

    // validação do nome
    if (isEmpty(data.corporateName)) {
        throw {
            statusCode: 400,
            message: "Campo 'corporateName' não foi definido ou está faltando!"
        }
    }

    // validação do nome fantasia
    if (isEmpty(data.fantasyName)) {
        data.fantasyName = null;
    }

    // validação do telefone
    if (isEmpty(data.phone)) {
        data.phone = null;
    }

    // validação do cnpj
    if (isEmpty(data.cnpj)) {
        throw {
            statusCode: 400,
            message: "Campo 'cnpj' não pode ser vazio"
        }
    } else if (!isValidCNPJ(data.cnpj)) {
        throw {
            statusCode: 400,
            message: "Campo 'cnpj' DEVE ser válido!"
        }
    } else {
        // confere se ja existe o mesmo cnpj cadastrado
        await cnpjExists(data.cnpj);
    }

    // validação do endereço
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

    // validação do email
    if (isEmpty(data.email)) {
        data.email = null;
    } else if (data.email) {
        // confere se ja existe o mesmo email cadastrado
        await emailExists(data.email);
    }

    return await createCompanyRepo(data);
};

export const getCompanyService = async (data) => {

};

export const getCompanyByIdService = async (id) => {
    return await getCompanyByIdRepo(id);
};

export const updateCompanyService = async (id, data) => {

}

export const deleteCompanyService = async (id) => {
    const deletedCompany = await company.findById(id);

    if (deletedCompany) {
        return await deleteCompanyRepo(id);
    } else {
        throw {
            statusCode: 400,
            message: "A emrpesa não existe ou já foi deletada!"
        }
    }
}

