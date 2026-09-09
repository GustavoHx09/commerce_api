import {
    createBillService,
    getBillsService,
    getBillByIdService,
    updateBillService,
    payBillService,
    cancelBillService,
    softDeleteBillService,
    restoreBillService,
} from "./billService.js";
import { successResponse } from "../../shared/utils/responseHelpers.js";
import { ensureFound } from "../../shared/utils/controllerHelpers.js";

export const createBill = async (req, res) => {
    const bill = await createBillService(req.body, req.tenantId, req.user.id);
    return successResponse(res, { bill }, "Conta criada com sucesso", 201);
};

export const getBills = async (req, res) => {
    const includeDeleted = req.user.role === "master" && req.query.includeDeleted === "true";
    const result = await getBillsService(req.query, req.tenantId, includeDeleted);
    return successResponse(res, result, "Contas listadas com sucesso");
};

export const getBillById = async (req, res) => {
    const includeDeleted = req.user.role === "master" && req.query.includeDeleted === "true";
    const bill = await getBillByIdService(req.params.id, req.tenantId, includeDeleted);
    ensureFound(bill, "Conta");
    return successResponse(res, { bill }, "Conta encontrada com sucesso");
};

export const updateBill = async (req, res) => {
    const bill = await updateBillService(req.params.id, req.body, req.tenantId, req.user.id);
    return successResponse(res, { bill }, "Conta atualizada com sucesso");
};

export const payBill = async (req, res) => {
    const bill = await payBillService(req.params.id, req.tenantId, req.user.id);
    return successResponse(res, { bill }, "Conta paga/recebida com sucesso");
};

export const cancelBill = async (req, res) => {
    const bill = await cancelBillService(req.params.id, req.tenantId, req.user.id);
    return successResponse(res, { bill }, "Conta cancelada com sucesso");
};

export const softDeleteBill = async (req, res) => {
    const bill = await softDeleteBillService(req.params.id, req.tenantId, req.user.id);
    return successResponse(res, { bill }, "Conta removida com sucesso");
};

export const restoreBill = async (req, res) => {
    const bill = await restoreBillService(req.params.id, req.tenantId, req.user.id);
    return successResponse(res, { bill }, "Conta restaurada com sucesso");
};
