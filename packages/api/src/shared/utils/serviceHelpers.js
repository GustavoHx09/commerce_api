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

// Mapa de equivalência de acentos usado nas buscas: cada letra-base agrupa
// suas variantes acentuadas para a busca casar "joao" e "joão" igualmente.
const accentGroups = {
    a: "aáàâãä",
    e: "eéèêë",
    i: "iíìîï",
    o: "oóòôõö",
    u: "uúùûü",
    c: "cç",
    n: "nñ",
};

// Escapa caracteres especiais de regex para evitar injeção de padrão.
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Converte o termo de busca em um padrão de regex insensível a acentos.
// Cada letra vira uma classe com suas variantes acentuadas (bidirecional:
// "joão" também encontra "joao"). Usar com $options: "i" para maiúsculas.
export const accentInsensitiveRegex = (term) =>
    String(term)
        .split("")
        .map((char) => {
            const group = accentGroups[char.toLowerCase()];
            if (group) return `[${group}${group.toUpperCase()}]`;
            return escapeRegex(char);
        })
        .join("");

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
