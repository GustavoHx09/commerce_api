import { authenticateUser, revokeToken } from "./authService.js";
import { requestPasswordReset, resetPassword } from "./passwordResetService.js";
import { successResponse } from "../../shared/utils/responseHelpers.js";
import { getPermissions } from "../../shared/utils/permissionHelpers.js";

// Nome do cookie HttpOnly que mantém a sessão autenticada no navegador.
export const AUTH_COOKIE = "authToken";

// Mantém os atributos do cookie centralizados para criação e remoção consistentes.
const getAuthCookieOptions = (includeMaxAge = true) => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
    ...(includeMaxAge && { maxAge: 7 * 24 * 60 * 60 * 1000 }),
});

// Autentica o usuário e inicia a sessão armazenando o JWT somente no cookie.
export const login = async (req, res) => {
    const { email, password } = req.body;
    const { user, token } = await authenticateUser(email, password);

    res.cookie(AUTH_COOKIE, token, getAuthCookieOptions());

    return successResponse(res, { user }, "Login realizado com sucesso");
};

// Retorna os dados da sessão decodificados pelo middleware de autenticação.
// Inclui a lista efetiva de permissões para o frontend esconder ações não
// permitidas (o backend continua validando cada rota).
export const getSession = async (req, res) => {
    const { id, name, email, role, tenantId } = req.user;

    return successResponse(res, {
        user: { id, name, email, role, tenantId, permissions: getPermissions(req.user) },
    }, "Sessão autenticada");
};

// Encerra a sessão removendo o JWT do navegador e adicionando à blacklist.
export const logout = async (req, res) => {
    const token = req.cookies?.authToken;

    if (token) {
        try {
            await revokeToken(token);
        } catch {
            // Ignora tokens inválidos/expirados; mesmo assim limpa o cookie.
        }
    }

    res.clearCookie(AUTH_COOKIE, getAuthCookieOptions(false));

    return successResponse(res, null, "Logout realizado com sucesso");
};

// Inicia o fluxo de recuperação de senha. A resposta é sempre a mesma,
// independente do email existir, para não revelar contas cadastradas.
export const forgotPassword = async (req, res) => {
    const { email } = req.body;

    await requestPasswordReset(email);

    return successResponse(res, null, "Se o email estiver cadastrado, enviaremos as instruções de recuperação");
};

// Redefine a senha do usuário a partir do token enviado por email.
export const resetPasswordController = async (req, res) => {
    const { token, password } = req.body;

    await resetPassword(token, password);

    return successResponse(res, null, "Senha redefinida com sucesso");
};
