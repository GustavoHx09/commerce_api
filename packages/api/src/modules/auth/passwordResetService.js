import crypto from "crypto";
import bcrypt from "bcrypt";
import users from "../user/userModel.js";
import { appConfig } from "../../shared/config/appConfig.js";
import { sendEmail } from "../../shared/utils/email/emailService.js";
import { throwValidationError, validateRequired } from "../../shared/utils/serviceHelpers.js";
import { auditAction, toPlain } from "../audit/auditHelpers.js";
import { hashToken } from "./authService.js";
import {
    createPasswordResetTokenRepo,
    findValidPasswordResetTokenRepo,
    invalidateUserResetTokensRepo,
    markResetTokenUsedRepo,
} from "./passwordResetRepo.js";

// Tempo de validade do token de recuperação de senha, em minutos.
const RESET_TOKEN_TTL_MINUTES = 60;

// Monta o HTML do email de recuperação com o link contendo o token em texto claro.
// Somente o hash do token fica persistido no banco.
const buildResetEmailHtml = (resetUrl) => `
    <p>Você solicitou a recuperação de senha da sua conta.</p>
    <p>Clique no link abaixo para definir uma nova senha. O link é válido por ${RESET_TOKEN_TTL_MINUTES} minutos e só pode ser usado uma vez.</p>
    <p><a href="${resetUrl}">Redefinir minha senha</a></p>
    <p>Se você não fez esta solicitação, ignore este email.</p>
`;

// Inicia o fluxo de recuperação: gera token, salva o hash e envia o email via Resend.
// Sempre retorna o mesmo resultado para emails inexistentes/inativos, evitando
// que a resposta da API revele quais emails estão cadastrados.
export const requestPasswordReset = async (email) => {
    validateRequired(email, "email");

    const user = await users.findOne({
        email: email.toLowerCase(),
        deletedAt: null,
        isActive: true,
    });

    if (!user) {
        return { emailSent: false };
    }

    // Garante que apenas o token mais recente seja válido.
    await invalidateUserResetTokensRepo(user._id);

    const token = crypto.randomBytes(32).toString("hex");

    await createPasswordResetTokenRepo({
        tokenHash: hashToken(token),
        userId: user._id,
        tenantId: user.tenantId,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000),
    });

    const resetUrl = `${appConfig.webUrl}/reset-password?token=${token}`;

    const result = await sendEmail({
        to: user.email,
        subject: "Recuperação de senha",
        html: buildResetEmailHtml(resetUrl),
    });

    return { emailSent: result.sent };
};

// Conclui a recuperação: valida o token, redefine a senha e revoga sessões antigas.
export const resetPassword = async (token, newPassword) => {
    validateRequired(token, "token");
    validateRequired(newPassword, "nova senha");

    if (newPassword.length < 6) {
        throwValidationError("A senha deve ter no mínimo 6 caracteres");
    }

    const resetToken = await findValidPasswordResetTokenRepo(hashToken(token));

    if (!resetToken) {
        throwValidationError("Token inválido ou expirado");
    }

    const user = await users.findById(resetToken.userId);

    if (!user || user.deletedAt || !user.isActive) {
        throwValidationError("Token inválido ou expirado");
    }

    const previousUser = toPlain(user);

    user.password = await bcrypt.hash(newPassword, 10);
    // Atualiza o marco de troca de senha, revogando sessões JWT emitidas antes dele.
    user.passwordChangedAt = new Date();
    await user.save();

    await markResetTokenUsedRepo(resetToken._id);

    await auditAction("user", "update", previousUser, user, user._id);

    return true;
};
