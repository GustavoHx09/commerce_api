import {
    createSupplierRepo,
    getSuppliersRepo,
    countSuppliersRepo,
    getSupplierByIdRepo,
    updateSupplierRepo,
    softDeleteSupplierRepo,
    restoreSupplierRepo,
    hardDeleteSupplierRepo,
} from "./supplierRepo.js";
import { baseQuery } from "../../shared/utils/repositoryHelpers.js";
import { isValidDocument, formatDocument, isValidPhone, emailIsValid, cepIsValid } from "../../shared/utils/fieldsValidations.js";
import { validateRequired, throwValidationError } from "../../shared/utils/serviceHelpers.js";
import { getPagination, getSort, paginatedResponse } from "../../shared/utils/paginationHelpers.js";
import { auditAction } from "../audit/auditHelpers.js";

const validateDocument = (document, type) => {
    const cleaned = formatDocument(document);

    if (!isValidDocument(cleaned, type)) {
        throwValidationError(`${type.toUpperCase()} inválido`);
    }

    return cleaned;
};

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

    return {
        name: String(data.name).trim(),
        document: validateDocument(data.document, data.documentType),
        documentType: data.documentType,
        phone: data.phone ? String(data.phone).trim() : null,
        email: data.email ? String(data.email).toLowerCase().trim() : null,
        contactName: data.contactName ? String(data.contactName).trim() : null,
        address: normalizeAddress(data.address),
    };
};

const validateUpdate = (data, supplier) => {
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

    if (data.contactName !== undefined) {
        update.contactName = data.contactName ? String(data.contactName).trim() : null;
    }

    if (data.address !== undefined) {
        if (data.address?.zipCode && !cepIsValid(data.address.zipCode)) {
            throwValidationError("CEP inválido", 422);
        }
        update.address = normalizeAddress(data.address);
    }

    if (data.documentType !== undefined || data.document !== undefined) {
        const type = data.documentType || supplier.documentType;
        const document = data.document || supplier.document;
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

const getSupplierByDocument = async (document, tenantId) => {
    const list = await getSuppliersRepo({ document, tenantId, deletedAt: null }, 0, 1, {});
    return list[0]?._id || null;
};

export const createSupplierService = async (data, tenantId, actorId) => {
    const validated = validateCreate(data);

    const existing = await getSupplierByDocument(validated.document, tenantId);
    if (existing) {
        throwValidationError("Documento já cadastrado para este fornecedor", 409);
    }

    const supplier = await createSupplierRepo({ ...validated, tenantId });

    await auditAction("supplier", "create", null, supplier, actorId);

    return supplier;
};

export const getSuppliersService = async (query, tenantId, includeDeleted = false) => {
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

    const [data, total] = await Promise.all([
        getSuppliersRepo(filter, skip, limit, sort),
        countSuppliersRepo(filter),
    ]);

    return paginatedResponse(data, page, limit, total);
};

export const getSupplierByIdService = (id, tenantId, includeDeleted = false) => {
    return getSupplierByIdRepo(id, tenantId, includeDeleted);
};

export const updateSupplierService = async (id, data, tenantId, actorId) => {
    const previous = await getSupplierByIdRepo(id, tenantId, false);

    if (!previous) {
        throwValidationError("Fornecedor não encontrado", 404);
    }

    const update = validateUpdate(data, previous);

    if (update.document) {
        const existing = await getSupplierByDocument(update.document, tenantId);
        if (existing && existing.toString() !== id.toString()) {
            throwValidationError("Documento já cadastrado para outro fornecedor", 409);
        }
    }

    const supplier = await updateSupplierRepo(id, update, tenantId);

    await auditAction("supplier", "update", previous, supplier, actorId);

    return supplier;
};

export const softDeleteSupplierService = async (id, tenantId, actorId) => {
    const previous = await getSupplierByIdRepo(id, tenantId, false);

    if (!previous) {
        throwValidationError("Fornecedor não encontrado", 404);
    }

    const supplier = await softDeleteSupplierRepo(id, tenantId);

    await auditAction("supplier", "delete", previous, supplier, actorId);

    return supplier;
};

export const hardDeleteSupplierService = async (id, actor) => {
    if (actor.role !== "master") {
        throwValidationError("Apenas master pode fazer hard delete", 403);
    }

    const supplier = await getSupplierByIdRepo(id, null, true);

    if (!supplier) {
        throwValidationError("Fornecedor não encontrado", 404);
    }

    await auditAction("supplier", "delete", supplier, null, actor.id);

    return await hardDeleteSupplierRepo(id);
};

export const restoreSupplierService = async (id, tenantId, actorId) => {
    const previous = await getSupplierByIdRepo(id, tenantId, true);

    if (!previous) {
        throwValidationError("Fornecedor não encontrado", 404);
    }

    if (!previous.deletedAt) {
        throwValidationError("Fornecedor não está removido", 400);
    }

    const supplier = await restoreSupplierRepo(id, tenantId);

    await auditAction("supplier", "restore", previous, supplier, actorId);

    return supplier;
};
