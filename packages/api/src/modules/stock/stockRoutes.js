// Rotas de movimentação de estoque e alertas de estoque baixo.
import { Router } from "express";
import {
    createStockMovement,
    getStockMovements,
    getStockMovementById,
    getLowStock,
} from "./stockController.js";
import { authMiddleware, tenantMiddleware } from "../../shared/middlewares/authMiddleware.js";
import { authorize } from "../../shared/middlewares/authorizeMiddleware.js";
import { validateObjectId } from "../../shared/middlewares/validateObjectId.js";
import { asyncHandler } from "../../shared/middlewares/asyncHandler.js";

const router = Router();

router.get("/movements", authMiddleware, tenantMiddleware, authorize("stock", "read"), asyncHandler(getStockMovements));
router.post("/movements", authMiddleware, tenantMiddleware, authorize("stock", "write"), asyncHandler(createStockMovement));
router.get("/movements/:id", authMiddleware, tenantMiddleware, validateObjectId(), authorize("stock", "read"), asyncHandler(getStockMovementById));
router.get("/low-stock", authMiddleware, tenantMiddleware, authorize("stock", "read"), asyncHandler(getLowStock));

export default router;
