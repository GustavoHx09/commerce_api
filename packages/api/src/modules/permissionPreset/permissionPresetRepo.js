import permissionPresets from "./permissionPresetModel.js";
import { baseQuery } from "../../shared/utils/repositoryHelpers.js";

// Cria um novo preset de permissões.
export const createPermissionPresetRepo = (data) => permissionPresets.create(data);

// Retorna presets paginados com base no filtro.
export const getPermissionPresetsRepo = (filter, skip, limit, sort) =>
    permissionPresets.find(filter).skip(skip).limit(limit).sort(sort);

// Conta presets que satisfazem o filtro.
export const countPermissionPresetsRepo = (filter) =>
    permissionPresets.countDocuments(filter);

// Busca um preset pelo ID dentro dos critérios de tenant e soft delete.
export const getPermissionPresetByIdRepo = (id, tenantId, includeDeleted = false) =>
    permissionPresets.findOne({ _id: id, ...baseQuery(tenantId, includeDeleted) });

// Atualiza um preset do tenant e retorna o documento atualizado.
export const updatePermissionPresetRepo = (id, data, tenantId) =>
    permissionPresets.findOneAndUpdate(
        { _id: id, ...baseQuery(tenantId, false) },
        data,
        { new: true }
    );

// Realiza soft delete de um preset do tenant.
export const softDeletePermissionPresetRepo = (id, tenantId) =>
    permissionPresets.findOneAndUpdate(
        { _id: id, ...baseQuery(tenantId, false) },
        { deletedAt: new Date() },
        { new: true }
    );

// Restaura um preset previamente excluído por soft delete.
export const restorePermissionPresetRepo = (id, tenantId) =>
    permissionPresets.findOneAndUpdate(
        { _id: id, ...baseQuery(tenantId, true) },
        { deletedAt: null },
        { new: true }
    );
