import users from "../models/usersModel.js";

export const isValidPhone = (phone) => {
    const cleanedPhone = phone.replace(/\D/g, "");
    return /^(?:\d{10}|\d{11})$/.test(cleanedPhone);
};

export const isValidCPF = (cpf) => {
    cpf = cpf.replace(/\D/g, "");

    if (cpf.length !== 11) return false;
    if (/(\d)\1{10}/.test(cpf)) return false;

    let sum = 0;
    let remainder;

    for (let i = 1; i <= 9; i++) {
        sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    }

    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(9, 10))) return false;

    sum = 0;

    for (let i = 1; i <= 10; i++) {
        sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    }

    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(10, 11))) return false;

    return true;
};

export async function cpfExists(cpf) {
    const user = await users.findOne({ cpf, deletedAt: null });

    if (user) {
        throw {
            statusCode: 400,
            message: "AVISO: CPF já cadastrado no sistema!",
        };
    }
}

export function emailIsValid(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

export async function emailExists(email) {
    const user = await users.findOne({ email: email.toLowerCase(), deletedAt: null });

    if (user) {
        throw {
            statusCode: 400,
            message: "AVISO: Email já cadastrado",
        };
    }
}

export function cepIsValid(cep) {
    const regex = /^[0-9]{5}-?[0-9]{3}$/;
    return regex.test(cep);
}
