import { Router } from "express";
import {
    createBill,
    getBills,
    getBillById,
    updateBill,
    payBill,
    cancelBill,
    softDeleteBill,
    restoreBill,
} from "./billController.js";
import { authMiddleware, tenantMiddleware } from "../../shared/middlewares/authMiddleware.js";
import { authorize } from "../../shared/middlewares/authorizeMiddleware.js";
import { validateObjectId } from "../../shared/middlewares/validateObjectId.js";
import { asyncHandler } from "../../shared/middlewares/asyncHandler.js";

const router = Router();

router.get("/", authMiddleware, tenantMiddleware, authorize("bills", "read"), asyncHandler(getBills));
router.post("/", authMiddleware, tenantMiddleware, authorize("bills", "write"), asyncHandler(createBill));
router.get("/:id", authMiddleware, tenantMiddleware, validateObjectId(), authorize("bills", "read"), asyncHandler(getBillById));
router.put("/:id", authMiddleware, tenantMiddleware, validateObjectId(), authorize("bills", "write"), asyncHandler(updateBill));
router.put("/:id/pay", authMiddleware, tenantMiddleware, validateObjectId(), authorize("bills", "write"), asyncHandler(payBill));
router.put("/:id/cancel", authMiddleware, tenantMiddleware, validateObjectId(), authorize("bills", "write"), asyncHandler(cancelBill));
router.put("/:id/restore", authMiddleware, tenantMiddleware, validateObjectId(), authorize("bills", "write"), asyncHandler(restoreBill));
router.delete("/:id", authMiddleware, tenantMiddleware, validateObjectId(), authorize("bills", "delete"), asyncHandler(softDeleteBill));

export default router;
