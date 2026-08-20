import {
    createTenantService,
    getTenantsService,
    getTenantByIdService,
    updateTenantService,
    deleteTenantService,
} from "../services/tenantsService.js";
import { successResponse } from "../utils/responseHelpers.js";

export const createTenant = async (req, res) => {
    const tenant = await createTenantService(req.body);
    return successResponse(res, { tenant }, "Tenant criado com sucesso", 201);
};

export const getTenants = async (req, res) => {
    const result = await getTenantsService(req.query);
    return successResponse(res, result, "Tenants listados com sucesso");
};

export const getTenantById = async (req, res) => {
    const tenant = await getTenantByIdService(req.params.id);
    return successResponse(res, { tenant }, "Tenant encontrado com sucesso");
};

export const updateTenant = async (req, res) => {
    const tenant = await updateTenantService(req.params.id, req.body);
    return successResponse(res, { tenant }, "Tenant atualizado com sucesso");
};

export const deleteTenant = async (req, res) => {
    await deleteTenantService(req.params.id);
    return successResponse(res, null, "Tenant deletado com sucesso");
};
