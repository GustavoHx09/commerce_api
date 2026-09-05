import {
    createStockMovementService,
    getStockMovementsService,
    getStockMovementByIdService,
} from "./stockMovementService.js";
import { getLowStockProductsService } from "../product/productService.js";
import { successResponse } from "../../shared/utils/responseHelpers.js";
import { ensureFound } from "../../shared/utils/controllerHelpers.js";

// Cria uma nova movimentação de estoque e atualiza o produto.
export const createStockMovement = async (req, res) => {
    const movement = await createStockMovementService(req.body, req.tenantId, req.user.id);
    return successResponse(res, { movement }, "Movimentação registrada com sucesso", 201);
};

// Lista movimentações de estoque do tenant com paginação e filtros.
export const getStockMovements = async (req, res) => {
    const result = await getStockMovementsService(req.query, req.tenantId);
    return successResponse(res, result, "Movimentações listadas com sucesso");
};

// Busca uma movimentação específica pelo ID dentro do tenant.
export const getStockMovementById = async (req, res) => {
    const movement = await getStockMovementByIdService(req.params.id, req.tenantId);
    ensureFound(movement, "Movimentação");
    return successResponse(res, { movement }, "Movimentação encontrada com sucesso");
};

// Retorna produtos com estoque abaixo do mínimo configurado.
export const getLowStock = async (req, res) => {
    const result = await getLowStockProductsService(req.query, req.tenantId);
    return successResponse(res, result, "Produtos com estoque baixo listados com sucesso");
};
