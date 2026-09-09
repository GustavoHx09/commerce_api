import {
    createSupplierService,
    getSuppliersService,
    getSupplierByIdService,
    updateSupplierService,
    softDeleteSupplierService,
    hardDeleteSupplierService,
    restoreSupplierService,
} from "./supplierService.js";
import { successResponse } from "../../shared/utils/responseHelpers.js";
import { ensureFound } from "../../shared/utils/controllerHelpers.js";

export const createSupplier = async (req, res) => {
    const supplier = await createSupplierService(req.body, req.tenantId, req.user.id);
    return successResponse(res, { supplier }, "Fornecedor criado com sucesso", 201);
};

export const getSuppliers = async (req, res) => {
    const includeDeleted = req.user.role === "master" && req.query.includeDeleted === "true";
    const result = await getSuppliersService(req.query, req.tenantId, includeDeleted);
    return successResponse(res, result, "Fornecedores listados com sucesso");
};

export const getSupplierById = async (req, res) => {
    const includeDeleted = req.user.role === "master" && req.query.includeDeleted === "true";
    const supplier = await getSupplierByIdService(req.params.id, req.tenantId, includeDeleted);
    ensureFound(supplier, "Fornecedor");
    return successResponse(res, { supplier }, "Fornecedor encontrado com sucesso");
};

export const updateSupplier = async (req, res) => {
    const supplier = await updateSupplierService(req.params.id, req.body, req.tenantId, req.user.id);
    return successResponse(res, { supplier }, "Fornecedor atualizado com sucesso");
};

export const softDeleteSupplier = async (req, res) => {
    const supplier = await softDeleteSupplierService(req.params.id, req.tenantId, req.user.id);
    return successResponse(res, { supplier }, "Fornecedor removido com sucesso");
};

export const hardDeleteSupplier = async (req, res) => {
    await hardDeleteSupplierService(req.params.id, req.user);
    return successResponse(res, null, "Fornecedor deletado permanentemente");
};

export const restoreSupplier = async (req, res) => {
    const supplier = await restoreSupplierService(req.params.id, req.tenantId, req.user.id);
    return successResponse(res, { supplier }, "Fornecedor restaurado com sucesso");
};
