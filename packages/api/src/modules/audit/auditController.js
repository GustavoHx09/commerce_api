import { getAuditLogsService } from "./auditService.js";
import { successResponse } from "../../shared/utils/responseHelpers.js";

// Lista os registros de auditoria, isolados ao tenant do usuário autenticado.
export const getAuditLogs = async (req, res) => {
    const result = await getAuditLogsService(req.query, req.tenantId, req.user.role === "master");
    return successResponse(res, result, "Logs de auditoria listados com sucesso");
};
