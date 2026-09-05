import {
    createCustomerRepo,
    getCustomersRepo,
    countCustomersRepo,
    getCustomerByIdRepo,
    updateCustomerRepo,
    softDeleteCustomerRepo,
    restoreCustomerRepo,
    hardDeleteCustomerRepo,
} from "./customerRepo.js";
import { baseQuery } from "../../shared/utils/repositoryHelpers.js";
import { isValidDocument, formatDocument, isValidPhone, emailIsValid, cepIsValid } from "../../shared/utils/fieldsValidations.js";
import { validateRequired, throwValidationError } from "../../shared/utils/serviceHelpers.js";
import { getPagination, getSort, paginatedResponse } from "../../shared/utils/paginationHelpers.js";
import { auditAction } from "../audit/auditHelpers.js";

// Padroniza e valida um documento CPF/CNPJ.
const validateDocument = (document, type) => {
    const cleaned = formatDocument(document);

    if (!isValidDocument(cleaned, type)) {
        throwValidationError(`${type.toUpperCase()} inválido`);
    }

    return cleaned;
};

// Normaliza o objeto de endereço.
const normalizeAddress = (address) => {
    if (!address) return {};

    return {
        street: address.street?.trim() || null,
        number: address.number?.trim() || null,
        complement: address.complement?.trim() || null,
        neighborhood: address.neighborhood?.trim() || null,
        city: address.city?.trim() || null,
        state: address.state?.trim() || null,
        zipCode: address.zipCode?.trim() || null,
    };
};

const validateCreate = (data) => {
    validateRequired(data.name, "nome");
    validateRequired(data.document, "documento");
    validateRequired(data.documentType, "tipo de documento");

    if (data.email && !emailIsValid(data.email)) {
        throwValidationError("Email inválido", 422);
    }

    if (data.phone && !isValidPhone(data.phone)) {
        throwValidationError("Telefone inválido", 422);
    }

    if (data.address?.zipCode && !cepIsValid(data.address.zipCode)) {
        throwValidationError("CEP inválido", 422);
    }

    const cleanedDocument = validateDocument(data.document, data.documentType);

    return {
        name: String(data.name).trim(),
        document: cleanedDocument,
        documentType: data.documentType,
        phone: data.phone ? String(data.phone).trim() : null,
        email: data.email ? String(data.email).toLowerCase().trim() : null,
        address: normalizeAddress(data.address),
    };
};

const validateUpdate = (data, customer) => {
    const update = {};

    if (data.name !== undefined) {
        validateRequired(data.name, "nome");
        update.name = String(data.name).trim();
    }

    if (data.email !== undefined) {
        if (data.email && !emailIsValid(data.email)) {
            throwValidationError("Email inválido", 422);
        }
        update.email = data.email ? String(data.email).toLowerCase().trim() : null;
    }

    if (data.phone !== undefined) {
        if (data.phone && !isValidPhone(data.phone)) {
            throwValidationError("Telefone inválido", 422);
        }
        update.phone = data.phone ? String(data.phone).trim() : null;
    }

    if (data.address !== undefined) {
        if (data.address?.zipCode && !cepIsValid(data.address.zipCode)) {
            throwValidationError("CEP inválido", 422);
        }
        update.address = normalizeAddress(data.address);
    }

    if (data.documentType !== undefined || data.document !== undefined) {
        const type = data.documentType || customer.documentType;
        const document = data.document || customer.document;
        update.document = validateDocument(document, type);
        update.documentType = type;
    }

    if (data.isActive !== undefined) {
        if (typeof data.isActive !== "boolean") {
            throwValidationError("isActive deve ser booleano");
        }
        update.isActive = data.isActive;
    }

    if (Object.keys(update).length === 0) {
        throwValidationError("Nenhum campo válido para atualização");
    }

    return update;
};

// Busca um cliente ativo pelo documento dentro do tenant.
const getCustomerByDocument = async (document, tenantId) => {
    const customersList = await getCustomersRepo({ document, tenantId, deletedAt: null }, 0, 1, {});
    return customersList[0]?._id || null;
};

export const createCustomerService = async (data, tenantId, actorId) => {
    const validated = validateCreate(data);

    const existing = await getCustomerByDocument(validated.document, tenantId);
    if (existing) {
        throwValidationError("Documento já cadastrado para este cliente", 409);
    }

    const customer = await createCustomerRepo({ ...validated, tenantId });

    await auditAction("customer", "create", null, customer, actorId);

    return customer;
};

export const getCustomersService = async (query, tenantId, includeDeleted = false) => {
    const { page, limit, skip } = getPagination(query);
    const sort = getSort(query, "name");

    const filter = { ...baseQuery(tenantId, includeDeleted) };

    if (query.isActive !== undefined) {
        filter.isActive = query.isActive === "true";
    }

    if (query.search) {
        const term = query.search.trim();
        filter.$or = [
            { name: { $regex: term, $options: "i" } },
            { document: { $regex: term, $options: "i" } },
            { email: { $regex: term, $options: "i" } },
        ];
    }

    const [customers, total] = await Promise.all([
        getCustomersRepo(filter, skip, limit, sort),
        countCustomersRepo(filter),
    ]);

    return paginatedResponse(customers, page, limit, total);
};

export const getCustomerByIdService = (id, tenantId, includeDeleted = false) => {
    return getCustomerByIdRepo(id, tenantId, includeDeleted);
};

export const updateCustomerService = async (id, data, tenantId, actorId) => {
    const previous = await getCustomerByIdRepo(id, tenantId, false);

    if (!previous) {
        throwValidationError("Cliente não encontrado", 404);
    }

    const update = validateUpdate(data, previous);

    if (update.document) {
        const existing = await getCustomerByDocument(update.document, tenantId);
        if (existing && existing.toString() !== id.toString()) {
            throwValidationError("Documento já cadastrado para outro cliente", 409);
        }
    }

    const customer = await updateCustomerRepo(id, update, tenantId);

    await auditAction("customer", "update", previous, customer, actorId);

    return customer;
};

export const softDeleteCustomerService = async (id, tenantId, actorId) => {
    const previous = await getCustomerByIdRepo(id, tenantId, false);

    if (!previous) {
        throwValidationError("Cliente não encontrado", 404);
    }

    const customer = await softDeleteCustomerRepo(id, tenantId);

    await auditAction("customer", "delete", previous, customer, actorId);

    return customer;
};

export const hardDeleteCustomerService = async (id, actor) => {
    if (actor.role !== "master") {
        throwValidationError("Apenas master pode fazer hard delete", 403);
    }

    const customer = await getCustomerByIdRepo(id, null, true);

    if (!customer) {
        throwValidationError("Cliente não encontrado", 404);
    }

    await auditAction("customer", "delete", customer, null, actor.id);

    return await hardDeleteCustomerRepo(id);
};

export const restoreCustomerService = async (id, tenantId, actorId) => {
    const previous = await getCustomerByIdRepo(id, tenantId, true);

    if (!previous) {
        throwValidationError("Cliente não encontrado", 404);
    }

    if (!previous.deletedAt) {
        throwValidationError("Cliente não está removido", 400);
    }

    const customer = await restoreCustomerRepo(id, tenantId);

    await auditAction("customer", "restore", previous, customer, actorId);

    return customer;
};
