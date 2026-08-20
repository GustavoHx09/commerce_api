// Lança um erro 404 se o recurso não foi encontrado.
export const ensureFound = (resource, resourceName = "Recurso") => {
    if (!resource) {
        const error = new Error(`${resourceName} não encontrado`);
        error.statusCode = 404;
        throw error;
    }

    return resource;
};
