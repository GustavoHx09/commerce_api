import audit from "./auditModel.js";

// Cria um registro de auditoria no banco de dados.
// Aceita uma sessão do Mongoose opcional para inclusão em transações.
export const createAuditLogRepo = async (data, { session } = {}) => {
    const [created] = await audit.create([data], { session });
    return created;
};

// Monta o filtro de consulta de auditoria, opcionalmente por entidade, tenant e ação.
const buildFilter = ({ entityType, entityId, tenantId, action }) => {
    const filter = {};

    if (entityType) filter.entityType = entityType;
    if (entityId) filter.entityId = entityId;
    if (tenantId) filter.tenantId = tenantId;
    if (action) filter.action = action;

    return filter;
};

// Lista registros de auditoria com base nos filtros.
export const getAuditLogsRepo = (filters, skip, limit) => {
    const filter = buildFilter(filters);
    return audit.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
};

// Conta o total de registros de auditoria que satisfazem os filtros.
export const countAuditLogsRepo = (filters) => {
    const filter = buildFilter(filters);
    return audit.countDocuments(filter);
};
