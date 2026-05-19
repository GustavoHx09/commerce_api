export const isValidPhone = (phone) => {

    // remove tudo que não for número
    const cleanedPhone = phone.replace(/\D/g, "");

    // valida:
    // fixo = 10 dígitos
    // celular = 11 dígitos
    return /^(?:\d{10}|\d{11})$/.test(cleanedPhone);
};