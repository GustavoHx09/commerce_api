import { Router } from "express";
import {
    createCashier,
    getCashiers,
    getCashierById,
    closeCashier,
    createCashierMovement,
    getCashierMovements,
    softDeleteCashier,
    hardDeleteCashier,
    restoreCashier,
} from "./cashierController.js";
import { authMiddleware, tenantMiddleware, isMaster } from "../../shared/middlewares/authMiddleware.js";
import { authorize } from "../../shared/middlewares/authorizeMiddleware.js";
import { validateObjectId } from "../../shared/middlewares/validateObjectId.js";
import { asyncHandler } from "../../shared/middlewares/asyncHandler.js";

const router = Router();

router.get("/", authMiddleware, tenantMiddleware, authorize("cashier", "read"), asyncHandler(getCashiers));
router.post("/", authMiddleware, tenantMiddleware, authorize("cashier", "write"), asyncHandler(createCashier));
router.get("/:id", authMiddleware, tenantMiddleware, validateObjectId(), authorize("cashier", "read"), asyncHandler(getCashierById));
router.put("/:id/close", authMiddleware, tenantMiddleware, validateObjectId(), authorize("cashier", "write"), asyncHandler(closeCashier));
router.post("/:id/movements", authMiddleware, tenantMiddleware, validateObjectId(), authorize("cashier", "write"), asyncHandler(createCashierMovement));
router.get("/:id/movements", authMiddleware, tenantMiddleware, validateObjectId(), authorize("cashier", "read"), asyncHandler(getCashierMovements));
router.put("/:id/restore", authMiddleware, tenantMiddleware, validateObjectId(), authorize("cashier", "write"), asyncHandler(restoreCashier));
router.delete("/:id", authMiddleware, tenantMiddleware, validateObjectId(), authorize("cashier", "delete"), asyncHandler(softDeleteCashier));
router.delete("/:id/hard", authMiddleware, isMaster, validateObjectId(), asyncHandler(hardDeleteCashier));

export default router;
