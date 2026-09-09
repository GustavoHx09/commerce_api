import { createOrderService, getOrdersService, getOrderByIdService, cancelOrderService } from "./orderService.js";
import { successResponse } from "../../shared/utils/responseHelpers.js";
import { ensureFound } from "../../shared/utils/controllerHelpers.js";

export const createOrder = async (req, res) => {
    const order = await createOrderService(req.body, req.tenantId, req.user.id);
    return successResponse(res, { order }, "Venda criada com sucesso", 201);
};

export const getOrders = async (req, res) => {
    const includeDeleted = req.user.role === "master" && req.query.includeDeleted === "true";
    const result = await getOrdersService(req.query, req.tenantId, includeDeleted);
    return successResponse(res, result, "Vendas listadas com sucesso");
};

export const getOrderById = async (req, res) => {
    const includeDeleted = req.user.role === "master" && req.query.includeDeleted === "true";
    const order = await getOrderByIdService(req.params.id, req.tenantId, includeDeleted);
    ensureFound(order, "Venda");
    return successResponse(res, { order }, "Venda encontrada com sucesso");
};

export const cancelOrder = async (req, res) => {
    const order = await cancelOrderService(req.params.id, req.body, req.tenantId, req.user.id);
    return successResponse(res, { order }, "Venda cancelada com sucesso");
};
