// Rate limit por usuário e tenant em memória.
// Em ambiente com uma única instância (piloto) isso é suficiente; para escalar horizontalmente,
// essa implementação deve ser substituída por uma store compartilhada (ex.: Redis).
const WINDOW_MS = 15 * 60 * 1000;
const USER_LIMIT = 1000;
const TENANT_LIMIT = 10000;

const memoryStore = new Map();

// Remove entradas expiradas do armazenamento em memória a cada janela.
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of memoryStore.entries()) {
        if (data.resetAt <= now) {
            memoryStore.delete(key);
        }
    }
}, WINDOW_MS);

// Incrementa o contador para uma chave e retorna o total atual.
async function increment(key) {
    const now = Date.now();
    const data = memoryStore.get(key);

    if (!data || data.resetAt <= now) {
        memoryStore.set(key, { count: 1, resetAt: now + WINDOW_MS });
        return 1;
    }

    data.count += 1;
    memoryStore.set(key, data);
    return data.count;
}

// Verifica se o número de requisições dentro da janela ultrapassa o limite.
async function check(key, limit) {
    if (!key) return;

    const total = await increment(key);

    if (total > limit) {
        const error = new Error("AVISO: Limite de requisições atingido");
        error.statusCode = 429;
        throw error;
    }
}

// Limita requisições por usuário autenticado.
export const checkUserRateLimit = (userId) => {
    return check(userId ? `rate:user:${userId}` : null, USER_LIMIT);
};

// Limita requisições por tenant.
export const checkTenantRateLimit = (tenantId) => {
    return check(tenantId ? `rate:tenant:${tenantId}` : null, TENANT_LIMIT);
};
