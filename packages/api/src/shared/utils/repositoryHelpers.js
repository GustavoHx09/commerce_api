// Monta o filtro base para consultas a documentos vinculados a um tenant.
// Filtra por tenantId quando fornecido e ignora registros soft-deleted por padrão.
export const baseQuery = (tenantId, includeDeleted = false) => {
    const query = {};

    if (tenantId) {
        query.tenantId = tenantId;
    }

    if (!includeDeleted) {
        query.deletedAt = null;
    }

    return query;
};
