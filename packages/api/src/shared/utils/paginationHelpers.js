// Extrai e normaliza os parâmetros de paginação da query string.
export const getPagination = (query) => {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.max(1, Math.min(parseInt(query.limit, 10) || 10, 100));
    const skip = (page - 1) * limit;

    return { page, limit, skip };
};

// Monta o objeto de ordenação do MongoDB a partir dos parâmetros da query.
export const getSort = (query, defaultField = "createdAt", defaultOrder = "desc") => {
    const allowedOrders = ["asc", "desc"];
    const sortField = query.sortBy || defaultField;
    const sortOrder = allowedOrders.includes(query.order) ? query.order : defaultOrder;

    return { [sortField]: sortOrder === "asc" ? 1 : -1 };
};

// Monta a estrutura padronizada de resposta paginada.
export const paginatedResponse = (data, page, limit, total) => {
    return {
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};
