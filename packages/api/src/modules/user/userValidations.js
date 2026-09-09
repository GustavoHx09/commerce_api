import users from "./userModel.js";
import { isValidCPF, isValidCNPJ, isValidPhone, emailIsValid, cepIsValid, isValidDocument, formatDocument } from "../../shared/utils/fieldsValidations.js";

export { isValidCPF, isValidCNPJ, isValidPhone, emailIsValid, cepIsValid, isValidDocument, formatDocument };

// Verifica se já existe um usuário ativo com o CPF informado.
export async function cpfExists(cpf) {
    const user = await users.findOne({ cpf, deletedAt: null });

    if (user) {
        throw {
            statusCode: 400,
            message: "AVISO: CPF já cadastrado no sistema!",
        };
    }
}

// Verifica se já existe um usuário ativo com o email informado.
export async function emailExists(email) {
    const user = await users.findOne({ email: email.toLowerCase(), deletedAt: null });

    if (user) {
        throw {
            statusCode: 400,
            message: "AVISO: Email já cadastrado",
        };
    }
}
