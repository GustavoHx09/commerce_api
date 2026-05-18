export const tenantMiddleware = (req, res, next) => {

    if (!req.user?.companyId) {
        return res.status(401).json({
            message: "Empresa não identificada"
        });
    }

    req.companyId = req.user.companyId;

    next();
};