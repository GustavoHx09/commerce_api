import mongoose from "mongoose";

// Executa um bloco de operações dentro de uma transação MongoDB.
// Se a conexão não for um replica set, executa o callback sem transação e emite um aviso.
// Aceita uma sessão externa opcional para permitir composição futura.
export const withTransaction = async (callback, { session } = {}) => {
    if (session) {
        return callback(session);
    }

    const client = mongoose.connection.getClient?.() || mongoose.connection.client;
    const topologyType = client?.topology?.description?.type;
    const isReplicaSet = topologyType && topologyType.includes("ReplicaSet");

    if (!isReplicaSet) {
        console.warn(
            "[transaction] Executando sem transação — MONGO_URI não aponta para um replica set."
        );
        return callback(undefined);
    }

    const s = await mongoose.startSession();
    s.startTransaction();

    try {
        const result = await callback(s);
        await s.commitTransaction();
        return result;
    } catch (error) {
        await s.abortTransaction().catch(() => {});
        throw error;
    } finally {
        s.endSession();
    }
};
