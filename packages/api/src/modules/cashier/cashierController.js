import {
    createCashierService,
    getCashiersService,
    getCashierByIdService,
    closeCashierService,
    createCashierMovementService,
    getCashierMovementsService,
    softDeleteCashierService,
    hardDeleteCashierService,
    restoreCashierService,
} from "./cashierService.js";
import { successResponse } from "../../shared/utils/responseHelpers.js";
import { ensureFound } from "../../shared/utils/controllerHelpers.js";

export const createCashier = async (req, res) => {
    const cashier = await createCashierService(req.body, req.tenantId, req.user.id);
    return successResponse(res, { cashier }, "Caixa aberto com sucesso", 201);
};

export const getCashiers = async (req, res) => {
    const includeDeleted = req.user.role === "master" && req.query.includeDeleted === "true";
    const result = await getCashiersService(req.query, req.tenantId, includeDeleted);
    return successResponse(res, result, "Caixas listados com sucesso");
};

export const getCashierById = async (req, res) => {
    const includeDeleted = req.user.role === "master" && req.query.includeDeleted === "true";
    const cashier = await getCashierByIdService(req.params.id, req.tenantId, includeDeleted);
    ensureFound(cashier, "Caixa");
    return successResponse(res, { cashier }, "Caixa encontrado com sucesso");
};

export const closeCashier = async (req, res) => {
    const cashier = await closeCashierService(req.params.id, req.tenantId, req.user.id);
    return successResponse(res, { cashier }, "Caixa fechado com sucesso");
};

export const createCashierMovement = async (req, res) => {
    const movement = await createCashierMovementService(req.params.id, req.body, req.tenantId, req.user.id);
    return successResponse(res, { movement }, "Movimentação registrada com sucesso", 201);
};

export const getCashierMovements = async (req, res) => {
    const result = await getCashierMovementsService(req.params.id, req.query, req.tenantId);
    return successResponse(res, result, "Movimentações listadas com sucesso");
};

export const softDeleteCashier = async (req, res) => {
    const cashier = await softDeleteCashierService(req.params.id, req.tenantId, req.user.id);
    return successResponse(res, { cashier }, "Caixa removido com sucesso");
};

export const hardDeleteCashier = async (req, res) => {
    await hardDeleteCashierService(req.params.id, req.user);
    return successResponse(res, null, "Caixa deletado permanentemente");
};

export const restoreCashier = async (req, res) => {
    const cashier = await restoreCashierService(req.params.id, req.tenantId, req.user.id);
    return successResponse(res, { cashier }, "Caixa restaurado com sucesso");
};
