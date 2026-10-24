import passwordResetTokens from "./passwordResetTokenModel.js";

// Persiste um novo token de recuperação (somente o hash) no banco.
export const createPasswordResetTokenRepo = (data) => passwordResetTokens.create(data);

// Busca um token válido: hash correspondente, não utilizado e ainda não expirado.
export const findValidPasswordResetTokenRepo = (tokenHash) => {
    return passwordResetTokens.findOne({
        tokenHash,
        usedAt: null,
        expiresAt: { $gt: new Date() },
    });
};

// Invalida todos os tokens pendentes de um usuário, garantindo que só o
// último token gerado possa ser usado para redefinir a senha.
export const invalidateUserResetTokensRepo = (userId) => {
    return passwordResetTokens.updateMany(
        { userId, usedAt: null },
        { usedAt: new Date() }
    );
};

// Marca um token como utilizado após a redefinição de senha bem-sucedida.
export const markResetTokenUsedRepo = (id) => {
    return passwordResetTokens.findByIdAndUpdate(id, { usedAt: new Date() });
};
