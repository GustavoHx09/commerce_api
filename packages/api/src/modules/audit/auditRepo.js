import audit from "./auditModel.js";

// Cria um registro de auditoria no banco de dados.
export const createAuditLogRepo = (data) => audit.create(data);

// Lista registros de auditoria de uma entidade específica.
export const getAuditLogsByEntityRepo = (entityType, entityId, tenantId, skip, limit) => {
    const filter = { entityType, entityId };
    if (tenantId) filter.tenantId = tenantId;

    return audit.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
};

// Conta o total de registros de auditoria de uma entidade.
export const countAuditLogsByEntityRepo = (entityType, entityId, tenantId) => {
    const filter = { entityType, entityId };
    if (tenantId) filter.tenantId = tenantId;

    return audit.countDocuments(filter);
};
