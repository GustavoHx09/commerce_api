import mongoose from "mongoose";
import { createAuditLogRepo, getAuditLogsRepo, countAuditLogsRepo } from "./auditRepo.js";
import { getPagination, paginatedResponse } from "../../shared/utils/paginationHelpers.js";

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
        } else if (
            value instanceof mongoose.Types.ObjectId ||
            value?._bsontype === "ObjectId" ||
            value?._bsontype === "ObjectID"
        ) {
            // Grava o id como string hex — permite resolver o vínculo
            // depois (usuário → nome, caixa → #N) e evita serialização BSON.
            // _bsontype cobre ObjectIds de outra instância do driver, caso
            // em que instanceof falha e o valor iria decomposto ({i0..i3}).
            cleaned[key] = value.toString();
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
// Aceita uma sessão do Mongoose opcional para inclusão em transações.
export const createAuditLog = async ({ entityType, entityId, tenantId, action, actorId, previous, next }, { session } = {}) => {
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
    }, { session });
};

// Converte um valor salvo no Mixed da auditoria em ObjectId: aceita a
// instância, a string hex e o formato antigo decomposto {i0,i1,i2,i3}
// (4 inteiros de 24 bits — artefato de serialização BSON em logs antigos).
const asAuditObjectId = (value) => {
    if (value instanceof mongoose.Types.ObjectId) return value;
    if (typeof value === "string" && mongoose.Types.ObjectId.isValid(value))
        return new mongoose.Types.ObjectId(value);
    if (
        value &&
        typeof value === "object" &&
        ["i0", "i1", "i2", "i3"].every((k) => Number.isInteger(value[k]))
    ) {
        const hex = [value.i0, value.i1, value.i2, value.i3]
            .map((n) => n.toString(16).padStart(6, "0"))
            .join("");
        if (mongoose.Types.ObjectId.isValid(hex))
            return new mongoose.Types.ObjectId(hex);
    }
    return null;
};

// Extrai um nome legível de um documento (snapshot salvo ou doc do banco).
const nameFromDoc = (doc) => {
    if (!doc || typeof doc !== "object") return null;

    for (const key of ["name", "displayName", "description", "sku", "email", "reason"]) {
        if (typeof doc[key] === "string" && doc[key]) return doc[key];
    }

    if (doc.orderNumber) return `Venda #${doc.orderNumber}`;
    if (doc.cashierNumber) return `Caixa #${doc.cashierNumber}`;

    return null;
};

// Tenta extrair um nome amigável do documento auditado a partir do snapshot
// (ou das alterações em exclusões). Evita exibir o ObjectId ao usuário.
const resolveEntityName = (log) => nameFromDoc(log.snapshot || log.changes);

// Coleção de origem por entidade auditada — usada como fallback para logs
// antigos cujo snapshot não guarda campo legível (ex.: antes do cashierNumber).
const entityCollections = {
    product: "products",
    category: "categories",
    customer: "customers",
    supplier: "suppliers",
    bill: "bills",
    order: "orders",
    orderItem: "orderItems",
    cashier: "cashiers",
    cashierMovement: "cashierMovements",
    payment: "payments",
    stockMovement: "stockMovements",
    user: "users",
    tenant: "tenants",
    permissionPreset: "permissionPresets",
};

// Lista os registros de auditoria respeitando o isolamento do tenant.
export const getAuditLogsService = async (query, tenantId, isMaster) => {
    const { page, limit, skip } = getPagination(query);

    const filters = {
        entityType: query.entityType,
        entityId: query.entityId,
        action: query.action,
        // Escopo "somente manuais" — repassado ao buildFilter do repo, que
        // exclui os registros gerados automaticamente pelo fluxo de venda.
        manualOnly: query.manualOnly,
    };

    // Master pode filtrar por outro tenant via query; outros usuários veem só o próprio.
    filters.tenantId = isMaster && query.tenantId ? query.tenantId : tenantId;

    const [logs, total] = await Promise.all([
        getAuditLogsRepo(filters, skip, limit),
        countAuditLogsRepo(filters),
    ]);

    // Anexa um nome legível do registro para exibição no lugar do ID.
    const data = logs.map((log) => {
        const obj = log.toObject ? log.toObject() : log;
        return { ...obj, entityName: resolveEntityName(obj) };
    });

    // Fallback: logs sem campo legível no snapshot (registros antigos) têm o
    // nome buscado diretamente na coleção da entidade, agrupado por tipo.
    const pending = new Map();
    for (const item of data) {
        if (item.entityName) continue;
        const collection = entityCollections[item.entityType];
        if (!collection) continue;
        if (!pending.has(collection)) pending.set(collection, []);
        pending.get(collection).push(item);
    }

    for (const [collection, items] of pending) {
        const ids = items
            .map((item) => item.entityId)
            .filter((id) => mongoose.Types.ObjectId.isValid(id))
            .map((id) => new mongoose.Types.ObjectId(String(id)));
        if (!ids.length) continue;
        const docs = await mongoose.connection
            .collection(collection)
            .find({ _id: { $in: ids } })
            .toArray();
        const byId = new Map(docs.map((doc) => [String(doc._id), doc]));
        for (const item of items) {
            item.entityName = nameFromDoc(byId.get(String(item.entityId)));
        }
    }

    for (const item of data) {
        if (!item.entityName) item.entityName = String(item.entityId);
    }

    // Referências internas guardadas no snapshot/changes são só ObjectIds —
    // resolve para um rótulo legível (usuário → nome, caixa → "Caixa #N")
    // para o detalhe da auditoria não exibir id cru. Aplica tanto em valores
    // diretos (create/delete) quanto em diffs {from,to} (update).
    const resolveRefs = async (matches, collection, toLabel) => {
        const asObjectId = asAuditObjectId;
        const eachRef = (fn) => {
            for (const item of data) {
                for (const source of [item.snapshot, item.changes].filter(Boolean)) {
                    for (const [key, value] of Object.entries(source)) {
                        if (!matches(key)) continue;
                        const isDiff = value && typeof value === "object" && ("from" in value || "to" in value);
                        const slots = isDiff ? ["from", "to"] : [null];
                        for (const slot of slots) {
                            const current = isDiff ? value[slot] : value;
                            fn(source, key, isDiff ? slot : null, isDiff ? value : null, current);
                        }
                    }
                }
            }
        };

        const ids = new Set();
        eachRef((source, key, slot, diff, current) => {
            const id = asObjectId(current);
            if (id) ids.add(String(id));
        });
        if (!ids.size) return;

        const docs = await mongoose.connection
            .collection(collection)
            .find({ _id: { $in: [...ids].map((id) => new mongoose.Types.ObjectId(id)) } })
            .toArray();
        const labels = new Map(docs.map((doc) => [String(doc._id), toLabel(doc)]));

        eachRef((source, key, slot, diff, current) => {
            // Objeto já populado no snapshot → guarda só o rótulo.
            if (current && typeof current === "object" && !(current instanceof mongoose.Types.ObjectId) && current.name) {
                if (slot !== null) diff[slot] = current.name; else source[key] = current.name;
                return;
            }
            const id = asObjectId(current);
            if (id && labels.get(String(id))) {
                if (slot !== null) diff[slot] = labels.get(String(id));
                else source[key] = labels.get(String(id));
            }
        });
    };

    // Campos *By/actorId apontam para funcionários; cashierId aponta para caixas.
    await resolveRefs(
        (key) => /By$/.test(key) || ["actorId", "userId", "responsibleId"].includes(key),
        "users",
        (doc) => doc.name
    );
    await resolveRefs(
        (key) => key === "cashierId",
        "cashiers",
        (doc) => `Caixa #${doc.cashierNumber ?? doc._id}`
    );

    // Logs de produto com diff de estoque ganham o contexto da movimentação
    // que causou a alteração (tipo, motivo e referência — ex.: "Venda #12").
    // A correspondência usa produto + saldo anterior/novo + responsável,
    // desempatando pela movimentação mais próxima no tempo.
    const stockDiffLogs = data.filter((item) => {
        const diff = item.changes?.quantityInStock;
        return (
            item.entityType === "product" &&
            diff &&
            typeof diff === "object" &&
            "from" in diff &&
            "to" in diff
        );
    });

    if (stockDiffLogs.length) {
        const productIds = [
            ...new Set(stockDiffLogs.map((item) => String(item.entityId))),
        ]
            .filter((id) => mongoose.Types.ObjectId.isValid(id))
            .map((id) => new mongoose.Types.ObjectId(id));
        const times = stockDiffLogs.map((item) =>
            new Date(item.createdAt).getTime()
        );

        const movements = await mongoose.connection
            .collection("stockmovements")
            .find({
                productId: { $in: productIds },
                createdAt: {
                    $gte: new Date(Math.min(...times) - 60_000),
                    $lte: new Date(Math.max(...times) + 60_000),
                },
            })
            .toArray();

        for (const item of stockDiffLogs) {
            const diff = item.changes.quantityInStock;
            const logTime = new Date(item.createdAt).getTime();
            // actorId pode vir populado ({ _id, name }) ou como ObjectId.
            const actorId = item.actorId?._id || item.actorId;
            const match = movements
                .filter(
                    (movement) =>
                        String(movement.productId) === String(item.entityId) &&
                        String(movement.createdBy) === String(actorId) &&
                        Number(movement.previousQuantity) === Number(diff.from) &&
                        Number(movement.newQuantity) === Number(diff.to)
                )
                .sort(
                    (a, b) =>
                        Math.abs(new Date(a.createdAt).getTime() - logTime) -
                        Math.abs(new Date(b.createdAt).getTime() - logTime)
                )[0];
            if (match) {
                item.stockContext = {
                    type: match.type,
                    reason: match.reason,
                    reference: match.reference,
                };
            }
        }
    }

    // paymentIds guarda listas de ObjectIds — resolveRefs só cobre valores
    // únicos, então os pagamentos da venda são resolvidos aqui: cada id vira
    // { method, amount, installments } para o detalhe exibir forma e valor.
    const forEachPaymentList = (fn) => {
        for (const item of data) {
            for (const source of [item.snapshot, item.changes].filter(Boolean)) {
                const value = source.paymentIds;
                if (!value) continue;
                const isDiff =
                    !Array.isArray(value) &&
                    typeof value === "object" &&
                    ("from" in value || "to" in value);
                for (const slot of isDiff ? ["from", "to"] : [null]) {
                    const list = slot === null ? value : value[slot];
                    if (Array.isArray(list)) fn(list);
                }
            }
        }
    };

    const paymentIds = new Set();
    forEachPaymentList((list) => {
        for (const entry of list) {
            const id = asAuditObjectId(entry);
            if (id) paymentIds.add(String(id));
        }
    });

    if (paymentIds.size) {
        const payments = await mongoose.connection
            .collection("payments")
            .find({
                _id: {
                    $in: [...paymentIds].map(
                        (id) => new mongoose.Types.ObjectId(id)
                    ),
                },
            })
            .toArray();
        const paymentById = new Map(
            payments.map((doc) => [String(doc._id), doc])
        );

        forEachPaymentList((list) => {
            for (let i = 0; i < list.length; i++) {
                const id = asAuditObjectId(list[i]);
                const doc = id && paymentById.get(String(id));
                if (doc) {
                    list[i] = {
                        method: doc.method,
                        amount: doc.amount,
                        installments: doc.installments,
                    };
                }
            }
        });
    }

    return paginatedResponse(data, page, limit, total);
};
