import bcrypt from "bcrypt";
import {
    createUserRepo,
    getUsersRepo,
    countUsersRepo,
    baseQuery,
    getUserByIdRepo,
    getUserByIdWithPasswordRepo,
    updateUserRepo,
    softDeleteUserRepo,
    hardDeleteUserRepo,
} from "../repositories/userRepo.js";
import { isEmpty, isValid, numberFormatReplace } from "../utils/fieldsValidations.js";
import {
    emailExists,
    emailIsValid,
    cpfExists,
    isValidCPF,
    isValidPhone,
    cepIsValid,
} from "../utils/userValidations.js";

const addressFields = [
    "number",
    "street",
    "neighborhood",
    "zipCode",
    "complement",
    "city",
    "state",
];

const normalizeAddress = (address) => {
    if (!address) return null;

    const normalized = {};

    addressFields.forEach((field) => {
        normalized[field] = isEmpty(address[field]) ? null : address[field];
    });

    return normalized;
};

const validateCreate = async (data, actor) => {
    if (isEmpty(data.name)) {
        throw { statusCode: 400, message: "AVISO: O nome é obrigatório" };
    }

    if (isEmpty(data.email)) {
        throw { statusCode: 400, message: "AVISO: O email é obrigatório" };
    }

    if (!emailIsValid(data.email)) {
        throw { statusCode: 422, message: "AVISO: Email inválido" };
    }

    await emailExists(data.email);

    if (isEmpty(data.cpf)) {
        throw { statusCode: 400, message: "AVISO: O CPF é obrigatório" };
    }

    if (!isValidCPF(data.cpf)) {
        throw { statusCode: 422, message: "AVISO: CPF inválido" };
    }

    data.cpf = numberFormatReplace(data.cpf);
    await cpfExists(data.cpf);

    if (isEmpty(data.phone)) {
        throw { statusCode: 400, message: "AVISO: O telefone é obrigatório" };
    }

    if (!isValidPhone(data.phone)) {
        throw { statusCode: 422, message: "AVISO: Telefone inválido" };
    }

    data.phone = numberFormatReplace(data.phone);

    if (isEmpty(data.password) || data.password.length < 6) {
        throw { statusCode: 400, message: "AVISO: A senha deve ter no mínimo 6 caracteres" };
    }

    data.password = await bcrypt.hash(data.password, 10);

    if (isEmpty(data.role)) {
        data.role = "user";
    }

    if (!["master", "admin", "user"].includes(data.role)) {
        throw { statusCode: 400, message: "AVISO: Role inválida" };
    }

    if (data.role === "master" && actor.role !== "master") {
        throw { statusCode: 403, message: "AVISO: Apenas master pode criar outro master" };
    }

    if (data.role !== "master" && isEmpty(data.tenantId)) {
        throw { statusCode: 400, message: "AVISO: Usuários admin/user devem ter um tenantId" };
    }

    if (data.role === "master") {
        data.tenantId = null;
    }

    data.address = normalizeAddress(data.address);

    if (data.address?.zipCode && !cepIsValid(data.address.zipCode)) {
        throw { statusCode: 422, message: "AVISO: CEP inválido" };
    }

    if (isEmpty(data.isActive)) {
        data.isActive = true;
    } else if (typeof data.isActive !== "boolean") {
        throw { statusCode: 400, message: "AVISO: isActive deve ser booleano" };
    }
};

const validateUpdate = async (data, user, actor) => {
    if (data.name !== undefined && isEmpty(data.name)) {
        throw { statusCode: 400, message: "AVISO: O nome é obrigatório" };
    }

    if (data.email !== undefined) {
        if (isEmpty(data.email)) {
            throw { statusCode: 400, message: "AVISO: O email é obrigatório" };
        }

        if (!emailIsValid(data.email)) {
            throw { statusCode: 422, message: "AVISO: Email inválido" };
        }

        if (data.email.toLowerCase() !== user.email.toLowerCase()) {
            await emailExists(data.email);
        }
    }

    if (data.cpf !== undefined) {
        if (isEmpty(data.cpf)) {
            throw { statusCode: 400, message: "AVISO: O CPF é obrigatório" };
        }

        if (!isValidCPF(data.cpf)) {
            throw { statusCode: 422, message: "AVISO: CPF inválido" };
        }

        data.cpf = numberFormatReplace(data.cpf);

        if (data.cpf !== user.cpf) {
            await cpfExists(data.cpf);
        }
    }

    if (data.phone !== undefined) {
        if (isEmpty(data.phone)) {
            throw { statusCode: 400, message: "AVISO: O telefone é obrigatório" };
        }

        if (!isValidPhone(data.phone)) {
            throw { statusCode: 422, message: "AVISO: Telefone inválido" };
        }

        data.phone = numberFormatReplace(data.phone);
    }

    if (data.password) {
        if (data.password.length < 6) {
            throw { statusCode: 400, message: "AVISO: A senha deve ter no mínimo 6 caracteres" };
        }

        const isMatch = await bcrypt.compare(data.password, user.password);
        if (isMatch) {
            delete data.password;
        } else {
            data.password = await bcrypt.hash(data.password, 10);
        }
    }

    if (data.role !== undefined) {
        if (!["master", "admin", "user"].includes(data.role)) {
            throw { statusCode: 400, message: "AVISO: Role inválida" };
        }

        if (data.role === "master" && actor.role !== "master") {
            throw { statusCode: 403, message: "AVISO: Apenas master pode definir role master" };
        }

        if (data.role === "master") {
            data.tenantId = null;
        }
    }

    if (data.tenantId !== undefined && data.role !== "master" && isEmpty(data.tenantId)) {
        throw { statusCode: 400, message: "AVISO: Usuários admin/user devem ter um tenantId" };
    }

    if (data.address) {
        const currentAddress = user.address || {};

        addressFields.forEach((field) => {
            if (data.address[field] !== undefined && isValid(data.address[field], currentAddress[field])) {
                delete data.address[field];
            }
        });

        if (data.address.zipCode && !cepIsValid(data.address.zipCode)) {
            throw { statusCode: 422, message: "AVISO: CEP inválido" };
        }

        if (Object.keys(data.address).length === 0) {
            delete data.address;
        } else {
            data.address = { ...currentAddress, ...data.address };
        }
    }

    if (data.isActive !== undefined && typeof data.isActive !== "boolean") {
        throw { statusCode: 400, message: "AVISO: isActive deve ser booleano" };
    }
};

export const createUserService = async (data, actor) => {
    await validateCreate(data, actor);
    return await createUserRepo(data);
};

export const getUsersService = async (query, tenantId, includeDeleted = false) => {
    const { getPagination, getSort, paginatedResponse } = await import("../utils/paginationHelpers.js");
    const { page, limit, skip } = getPagination(query);
    const sort = getSort(query);

    const filter = { ...baseQuery(tenantId, includeDeleted) };

    if (query.role) {
        filter.role = query.role;
    }

    if (query.isActive !== undefined) {
        filter.isActive = query.isActive === "true";
    }

    if (query.search) {
        const term = query.search.trim();
        filter.$or = [
            { name: { $regex: term, $options: "i" } },
            { email: { $regex: term.toLowerCase(), $options: "i" } },
        ];
    }

    const [users, total] = await Promise.all([
        getUsersRepo(filter, skip, limit, sort),
        countUsersRepo(filter),
    ]);

    return paginatedResponse(users, page, limit, total);
};

export const getUserByIdService = (id, tenantId, includeDeleted = false) => {
    return getUserByIdRepo(id, tenantId, includeDeleted);
};

export const updateUserService = async (id, data, actor) => {
    const user = await getUserByIdWithPasswordRepo(id, actor.tenantId, true);

    if (!user) {
        throw { statusCode: 404, message: "AVISO: Usuário não encontrado" };
    }

    if (actor.role !== "master" && user.tenantId?.toString() !== actor.tenantId?.toString()) {
        throw { statusCode: 403, message: "AVISO: Acesso negado a este usuário" };
    }

    if (user.role === "master" && actor.role !== "master") {
        throw { statusCode: 403, message: "AVISO: Apenas master pode alterar outro master" };
    }

    if (data.role && data.role !== user.role && actor.role !== "master") {
        throw { statusCode: 403, message: "AVISO: Apenas master pode alterar role" };
    }

    await validateUpdate(data, user, actor);

    if (Object.keys(data).length === 0) {
        throw { statusCode: 400, message: "AVISO: Nenhum campo válido para atualização" };
    }

    return await updateUserRepo(id, data, actor.tenantId);
};

export const softDeleteUserService = async (id, actor) => {
    const user = await getUserByIdRepo(id, actor.tenantId, false);

    if (!user) {
        throw { statusCode: 404, message: "AVISO: Usuário não encontrado" };
    }

    if (user.role === "master" && actor.role !== "master") {
        throw { statusCode: 403, message: "AVISO: Apenas master pode remover outro master" };
    }

    return await softDeleteUserRepo(id, actor.tenantId);
};

export const hardDeleteUserService = async (id, actor) => {
    if (actor.role !== "master") {
        throw { statusCode: 403, message: "AVISO: Apenas master pode fazer hard delete" };
    }

    return await hardDeleteUserRepo(id);
};
