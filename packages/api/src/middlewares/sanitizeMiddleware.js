const hasProhibitedKeys = (obj) => {
    if (typeof obj !== "object" || obj === null) return false;

    for (const key of Object.keys(obj)) {
        if (key.startsWith("$") || key.includes(".")) {
            return true;
        }

        if (hasProhibitedKeys(obj[key])) {
            return true;
        }
    }

    return false;
};

export const sanitizeMiddleware = (req, res, next) => {
    const targets = [req.body, req.query, req.params];

    for (const target of targets) {
        if (hasProhibitedKeys(target)) {
            return res.status(400).json({
                message: "AVISO: Requisição contém caracteres não permitidos",
            });
        }
    }

    next();
};
