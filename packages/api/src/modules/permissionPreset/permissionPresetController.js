import {
    createPermissionPresetService,
    getPermissionPresetsService,
    getPermissionPresetByIdService,
    updatePermissionPresetService,
    softDeletePermissionPresetService,
    restorePermissionPresetService,
} from "./permissionPresetService.js";
import { successResponse } from "../../shared/utils/responseHelpers.js";
import { getAvailablePermissions } from "../../shared/utils/permissionsCatalog.js";

// Cria um novo preset de permissões.
export const createPermissionPreset = async (req, res) => {
    const preset = await createPermissionPresetService(req.body, req.user);
    return successResponse(res, { preset }, "Preset criado com sucesso", 201);
};

// Lista presets disponíveis para o usuário (globais + do próprio tenant).
export const getPermissionPresets = async (req, res) => {
    const result = await getPermissionPresetsService(req.query, req.user);
    return successResponse(res, result, "Presets listados com sucesso");
};

// Busca um preset específico pelo ID.
export const getPermissionPresetById = async (req, res) => {
    const preset = await getPermissionPresetByIdService(req.params.id, req.user);
    return successResponse(res, { preset }, "Preset encontrado com sucesso");
};

// Atualiza um preset existente.
export const updatePermissionPreset = async (req, res) => {
    const preset = await updatePermissionPresetService(req.params.id, req.body, req.user);
    return successResponse(res, { preset }, "Preset atualizado com sucesso");
};

// Realiza soft delete de um preset.
export const softDeletePermissionPreset = async (req, res) => {
    const preset = await softDeletePermissionPresetService(req.params.id, req.user);
    return successResponse(res, { preset }, "Preset removido com sucesso");
};

// Restaura um preset previamente excluído por soft delete.
export const restorePermissionPreset = async (req, res) => {
    const preset = await restorePermissionPresetService(req.params.id, req.user);
    return successResponse(res, { preset }, "Preset restaurado com sucesso");
};

// Retorna o catálogo de permissões válidas do sistema para montar o painel.
export const getAvailablePermissionsController = async (_req, res) => {
    const permissions = getAvailablePermissions();
    return successResponse(res, { permissions }, "Permissões listadas com sucesso");
};
