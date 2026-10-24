import { Resend } from "resend";
import { appConfig } from "../../config/appConfig.js";

// Serviço central de envio de emails transacionais via Resend.
// Enquanto RESEND_API_KEY não estiver configurada, o envio é ignorado e retorna
// { sent: false, reason } — assim a estrutura fica pronta sem exigir a conta ainda.
export const sendEmail = async ({ to, subject, html }) => {
    if (!appConfig.resendApiKey) {
        console.warn("[email] RESEND_API_KEY não configurada; envio de email ignorado.");
        return { sent: false, reason: "resend_not_configured" };
    }

    const resend = new Resend(appConfig.resendApiKey);

    const { error } = await resend.emails.send({
        from: appConfig.emailFrom,
        to,
        subject,
        html,
    });

    if (error) {
        console.error(`[email] Falha ao enviar email via Resend: ${error.message}`);
        return { sent: false, reason: "resend_error" };
    }

    return { sent: true };
};
