import { Router } from "express";
import { createOrder, getOrders, getOrderById, cancelOrder } from "./orderController.js";
import { authMiddleware, tenantMiddleware } from "../../shared/middlewares/authMiddleware.js";
import { authorize } from "../../shared/middlewares/authorizeMiddleware.js";
import { validateObjectId } from "../../shared/middlewares/validateObjectId.js";
import { asyncHandler } from "../../shared/middlewares/asyncHandler.js";

const router = Router();

router.get("/", authMiddleware, tenantMiddleware, authorize("orders", "read"), asyncHandler(getOrders));
router.post("/", authMiddleware, tenantMiddleware, authorize("orders", "write"), asyncHandler(createOrder));
router.get("/:id", authMiddleware, tenantMiddleware, validateObjectId(), authorize("orders", "read"), asyncHandler(getOrderById));
router.put("/:id/cancel", authMiddleware, tenantMiddleware, validateObjectId(), authorize("orders", "delete"), asyncHandler(cancelOrder));

export default router;
