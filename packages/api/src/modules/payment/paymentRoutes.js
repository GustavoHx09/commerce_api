import { Router } from "express";
import { getPayments, getPaymentById } from "./paymentController.js";
import { authMiddleware, tenantMiddleware } from "../../shared/middlewares/authMiddleware.js";
import { authorize } from "../../shared/middlewares/authorizeMiddleware.js";
import { validateObjectId } from "../../shared/middlewares/validateObjectId.js";
import { asyncHandler } from "../../shared/middlewares/asyncHandler.js";

const router = Router();

router.get("/", authMiddleware, tenantMiddleware, authorize("orders", "read"), asyncHandler(getPayments));
router.get("/:id", authMiddleware, tenantMiddleware, validateObjectId(), authorize("orders", "read"), asyncHandler(getPaymentById));

export default router;
