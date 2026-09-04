// Verifica se o valor está vazio (undefined, null ou string em branco).
export const isEmpty = (value) => {
    if (value === undefined || value === null) return true;
    if (typeof value === "string" && value.trim() === "") return true;
    return false;
};

// Verifica se o valor é vazio ou igual ao valor atual, indicando que não deve ser atualizado.
export const isValid = (value, userValue) => {
    if (value === undefined || value === null) return true;
    if (typeof value === "string" && value.trim() === "") return true;
    if (value === userValue) return true;
    return false;
};

// Remove todos os caracteres não numéricos de uma string.
export const numberFormatReplace = (value) => {
    return value.replace(/\D/g, "");
};

// Gera um slug URL-friendly a partir de um texto.
export const generateSlug = (value) => {
    return value
        .toString()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
};
