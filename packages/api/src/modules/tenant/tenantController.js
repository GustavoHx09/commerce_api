import {
    createTenantService,
    getTenantsService,
    getTenantByIdService,
    updateTenantService,
    deleteTenantService,
    updateOwnTenantService,
    restoreTenantService,
    uploadTenantLogoService,
} from "./tenantService.js";
import { successResponse } from "../../shared/utils/responseHelpers.js";

// Cria um novo tenant. Apenas master pode executar.
export const createTenant = async (req, res) => {
    const tenant = await createTenantService(req.body, req.user.id);
    return successResponse(res, { tenant }, "Tenant criado com sucesso", 201);
};

// Lista todos os tenants com paginação e filtros.
export const getTenants = async (req, res) => {
    const result = await getTenantsService(req.query);
    return successResponse(res, result, "Tenants listados com sucesso");
};

// Busca um tenant específico pelo ID.
export const getTenantById = async (req, res) => {
    const tenant = await getTenantByIdService(req.params.id);
    return successResponse(res, { tenant }, "Tenant encontrado com sucesso");
};

// Atualiza os dados de um tenant.
export const updateTenant = async (req, res) => {
    const tenant = await updateTenantService(req.params.id, req.body, req.user.id);
    return successResponse(res, { tenant }, "Tenant atualizado com sucesso");
};

// Realiza soft delete de um tenant. Apenas master pode executar.
export const deleteTenant = async (req, res) => {
    await deleteTenantService(req.params.id, req.user.id);
    return successResponse(res, null, "Tenant removido com sucesso");
};

// Retorna os dados do tenant ao qual o usuário autenticado pertence.
export const getOwnTenant = async (req, res) => {
    const tenant = await getTenantByIdService(req.tenantId);
    return successResponse(res, { tenant }, "Tenant encontrado com sucesso");
};

// Atualiza os dados do próprio tenant do usuário autenticado.
export const updateOwnTenant = async (req, res) => {
    const tenant = await updateOwnTenantService(req.tenantId, req.body, req.user.id);
    return successResponse(res, { tenant }, "Tenant atualizado com sucesso");
};

// Restaura um tenant previamente removido por soft delete. Apenas master.
export const restoreTenant = async (req, res) => {
    const tenant = await restoreTenantService(req.params.id, req.user.id);
    return successResponse(res, { tenant }, "Tenant restaurado com sucesso");
};

// Faz upload da logo da própria empresa.
export const uploadTenantLogo = async (req, res) => {
    const protocol = req.protocol;
    const host = req.get("host");
    const baseUrl = `${protocol}://${host}`;

    const tenant = await uploadTenantLogoService(req.tenantId, req.file, baseUrl, req.user.id);
    return successResponse(res, { tenant }, "Logo enviada com sucesso");
};
