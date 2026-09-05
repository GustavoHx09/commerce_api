import { createAuditLogRepo } from "./auditRepo.js";

// Campos sensíveis que nunca devem ser armazenados em logs de auditoria.
const sensitiveFields = new Set(["password", "refreshToken", "accessToken"]);

// Remove campos sensíveis e funções antes de salvar em audit.
const sanitizeData = (data) => {
    if (!data || typeof data !== "object") return data;

    const cleaned = Array.isArray(data) ? [] : {};

    for (const key of Object.keys(data)) {
        if (sensitiveFields.has(key)) continue;

        const value = data[key];

        if (value instanceof Date) {
            cleaned[key] = value.toISOString();
        } else if (value && typeof value === "object" && value.constructor === Object) {
            cleaned[key] = sanitizeData(value);
        } else if (Array.isArray(value)) {
            cleaned[key] = value.map((item) => (typeof item === "object" ? sanitizeData(item) : item));
        } else {
            cleaned[key] = value;
        }
    }

    return cleaned;
};

// Calcula o delta entre o documento anterior e o atual para registrar apenas o que mudou.
const buildChanges = (action, previous, next) => {
    if (action === "delete") return sanitizeData(previous);
    if (action === "create") return sanitizeData(next);

    const changes = {};
    const allKeys = new Set([...Object.keys(previous || {}), ...Object.keys(next || {})]);

    for (const key of allKeys) {
        if (sensitiveFields.has(key)) continue;

        const previousValue = previous?.[key];
        const nextValue = next?.[key];

        if (JSON.stringify(previousValue) !== JSON.stringify(nextValue)) {
            changes[key] = { from: sanitizeData(previousValue), to: sanitizeData(nextValue) };
        }
    }

    return changes;
};

// Cria uma entrada de auditoria centralizada.
export const createAuditLog = async ({ entityType, entityId, tenantId, action, actorId, previous, next }) => {
    const changes = buildChanges(action, previous, next);

    // Evita salvar logs de update sem mudanças reais.
    if (action === "update" && Object.keys(changes).length === 0) return null;

    return await createAuditLogRepo({
        entityType,
        entityId,
        tenantId,
        action,
        actorId,
        changes,
        snapshot: action === "delete" ? null : sanitizeData(next),
    });
};
