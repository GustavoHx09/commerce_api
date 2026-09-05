import { createAuditLog } from "./auditService.js";

// Converte um documento Mongoose ou objeto simples em JSON limpo para auditoria.
export const toPlain = (doc) => {
    if (!doc) return null;
    if (doc.toObject) return doc.toObject();
    if (doc.toJSON) return doc.toJSON();
    return JSON.parse(JSON.stringify(doc));
};

// Cria um registro de auditoria padronizado para services.
export const auditAction = async (entityType, action, previous, next, actorId) => {
    return await createAuditLog({
        entityType,
        entityId: next?._id || previous?._id,
        tenantId: next?.tenantId || previous?.tenantId || null,
        action,
        actorId,
        previous: toPlain(previous),
        next: toPlain(next),
    });
};
