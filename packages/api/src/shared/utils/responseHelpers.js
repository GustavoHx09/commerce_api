// Retorna uma resposta padronizada de sucesso.
export const successResponse = (res, data, message = "Sucesso", statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
    });
};

// Retorna uma resposta padronizada de erro.
export const errorResponse = (res, message, statusCode = 500) => {
    return res.status(statusCode).json({
        success: false,
        message,
    });
};
