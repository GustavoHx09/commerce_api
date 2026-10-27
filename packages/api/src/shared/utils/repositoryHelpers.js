import mongoose from "mongoose";

// Converte o tenantId para ObjectId: necessário porque aggregations do MongoDB
// não fazem cast automático de string como o Mongoose faz em find/count.
const toObjectId = (tenantId) => {
    try {
        return new mongoose.Types.ObjectId(tenantId);
    } catch {
        return tenantId;
    }
};

// Monta o filtro base para consultas a documentos vinculados a um tenant.
// Filtra por tenantId quando fornecido e ignora registros soft-deleted por padrão.
export const baseQuery = (tenantId, includeDeleted = false) => {
    const query = {};

    if (tenantId) {
        query.tenantId = toObjectId(tenantId);
    }

    if (!includeDeleted) {
        query.deletedAt = null;
    }

    return query;
};
