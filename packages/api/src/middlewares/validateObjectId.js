import mongoose from "mongoose";

export const validateObjectId = (paramName = "id") => {
    return (req, res, next) => {
        const value = req.params[paramName];

        if (!value || !mongoose.Types.ObjectId.isValid(value)) {
            return res.status(400).json({ message: `AVISO: ${paramName} inválido` });
        }

        next();
    };
};
