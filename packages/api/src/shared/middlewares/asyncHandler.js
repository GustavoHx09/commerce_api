// Wrapper para controllers assíncronos.
// Captura erros de promises e os repassa para o middleware de erro do Express.
export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
