import {
    createCustomerService,
    getCustomersService,
    getCustomerByIdService,
    updateCustomerService,
    softDeleteCustomerService,
    hardDeleteCustomerService,
    restoreCustomerService,
} from "./customerService.js";
import { successResponse } from "../../shared/utils/responseHelpers.js";
import { ensureFound } from "../../shared/utils/controllerHelpers.js";

export const createCustomer = async (req, res) => {
    const customer = await createCustomerService(req.body, req.tenantId, req.user.id);
    return successResponse(res, { customer }, "Cliente criado com sucesso", 201);
};

export const getCustomers = async (req, res) => {
    const includeDeleted = req.user.role === "master" && req.query.includeDeleted === "true";
    const result = await getCustomersService(req.query, req.tenantId, includeDeleted);
    return successResponse(res, result, "Clientes listados com sucesso");
};

export const getCustomerById = async (req, res) => {
    const includeDeleted = req.user.role === "master" && req.query.includeDeleted === "true";
    const customer = await getCustomerByIdService(req.params.id, req.tenantId, includeDeleted);
    ensureFound(customer, "Cliente");
    return successResponse(res, { customer }, "Cliente encontrado com sucesso");
};

export const updateCustomer = async (req, res) => {
    const customer = await updateCustomerService(req.params.id, req.body, req.tenantId, req.user.id);
    return successResponse(res, { customer }, "Cliente atualizado com sucesso");
};

export const softDeleteCustomer = async (req, res) => {
    const customer = await softDeleteCustomerService(req.params.id, req.tenantId, req.user.id);
    return successResponse(res, { customer }, "Cliente removido com sucesso");
};

export const hardDeleteCustomer = async (req, res) => {
    await hardDeleteCustomerService(req.params.id, req.user);
    return successResponse(res, null, "Cliente deletado permanentemente");
};

export const restoreCustomer = async (req, res) => {
    const customer = await restoreCustomerService(req.params.id, req.tenantId, req.user.id);
    return successResponse(res, { customer }, "Cliente restaurado com sucesso");
};
