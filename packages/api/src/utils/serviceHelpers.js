import { isEmpty } from "./fieldsValidations.js";

// Lança um erro padronizado para validações de negócio nos services.
export const throwValidationError = (message, statusCode = 400) => {
    throw { statusCode, message: `AVISO: ${message}` };
};

// Garante que um campo obrigatório não esteja vazio.
export const validateRequired = (value, fieldName) => {
    if (isEmpty(value)) {
        throwValidationError(`O ${fieldName} é obrigatório`);
    }
};

// Garante que o valor seja um número positivo ou zero.
export const validatePositiveNumber = (value, fieldName) => {
    if (isNaN(value) || Number(value) < 0) {
        throwValidationError(`${fieldName} deve ser um número positivo`, 422);
    }
};

// Garante que o valor esteja dentro de um conjunto permitido.
export const validateEnum = (value, allowedValues, fieldName) => {
    if (!allowedValues.includes(value)) {
        throwValidationError(`${fieldName} inválida`);
    }
};

// Converte campos numéricos para Number e remove campos vazios de string.
export const sanitizeNumberFields = (data, fields) => {
    fields.forEach((field) => {
        if (data[field] === null || data[field] === undefined) {
            delete data[field];
        } else if (isNaN(data[field]) || Number(data[field]) < 0) {
            throwValidationError(`${field} deve ser um número positivo`, 422);
        } else {
            data[field] = Number(data[field]);
        }
    });
};
