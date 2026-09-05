import { getPaymentsService, getPaymentByIdService } from "./paymentService.js";
import { successResponse } from "../../shared/utils/responseHelpers.js";
import { ensureFound } from "../../shared/utils/controllerHelpers.js";

export const getPayments = async (req, res) => {
    const result = await getPaymentsService(req.query, req.tenantId);
    return successResponse(res, result, "Pagamentos listados com sucesso");
};

export const getPaymentById = async (req, res) => {
    const payment = await getPaymentByIdService(req.params.id, req.tenantId);
    ensureFound(payment, "Pagamento");
    return successResponse(res, { payment }, "Pagamento encontrado com sucesso");
};
