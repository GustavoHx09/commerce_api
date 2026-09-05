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

// Valida o formato básico de um endereço de email.
export const emailIsValid = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};

// Valida o formato de um CEP brasileiro (com ou sem hífen).
export const cepIsValid = (cep) => {
    const regex = /^[0-9]{5}-?[0-9]{3}$/;
    return regex.test(cep);
};

// Valida se o telefone possui 10 dígitos (fixo) ou 11 dígitos (celular).
export const isValidPhone = (phone) => {
    const cleanedPhone = phone.replace(/\D/g, "");
    return /^(?:\d{10}|\d{11})$/.test(cleanedPhone);
};

// Remove caracteres não numéricos de um documento (CPF/CNPJ).
export const formatDocument = (document) => {
    return document.replace(/\D/g, "");
};

// Valida o dígito verificador de um CPF brasileiro.
export const isValidCPF = (cpf) => {
    cpf = formatDocument(cpf);

    if (cpf.length !== 11) return false;
    if (/(\d)\1{10}/.test(cpf)) return false;

    let sum = 0;
    let remainder;

    for (let i = 1; i <= 9; i++) {
        sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    }

    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(9, 10))) return false;

    sum = 0;

    for (let i = 1; i <= 10; i++) {
        sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    }

    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(10, 11))) return false;

    return true;
};

// Valida o dígito verificador de um CNPJ brasileiro.
export const isValidCNPJ = (cnpj) => {
    cnpj = formatDocument(cnpj);

    if (cnpj.length !== 14) return false;
    if (/(\d)\1{13}/.test(cnpj)) return false;

    let size = cnpj.length - 2;
    let numbers = cnpj.substring(0, size);
    const digits = cnpj.substring(size);
    let sum = 0;
    let pos = size - 7;

    for (let i = size; i >= 1; i--) {
        sum += parseInt(numbers.charAt(size - i)) * pos--;
        if (pos < 2) pos = 9;
    }

    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(0))) return false;

    size += 1;
    numbers = cnpj.substring(0, size);
    sum = 0;
    pos = size - 7;

    for (let i = size; i >= 1; i--) {
        sum += parseInt(numbers.charAt(size - i)) * pos--;
        if (pos < 2) pos = 9;
    }

    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(1))) return false;

    return true;
};

// Valida um documento de acordo com seu tipo (cpf ou cnpj).
export const isValidDocument = (document, type) => {
    const cleaned = formatDocument(document);

    if (type === "cpf") return isValidCPF(cleaned);
    if (type === "cnpj") return isValidCNPJ(cleaned);

    return false;
};
