import { Router } from "express";
import {
    createSupplier,
    getSuppliers,
    getSupplierById,
    updateSupplier,
    softDeleteSupplier,
    hardDeleteSupplier,
    restoreSupplier,
} from "./supplierController.js";
import { authMiddleware, tenantMiddleware, isMaster } from "../../shared/middlewares/authMiddleware.js";
import { authorize } from "../../shared/middlewares/authorizeMiddleware.js";
import { validateObjectId } from "../../shared/middlewares/validateObjectId.js";
import { asyncHandler } from "../../shared/middlewares/asyncHandler.js";

const router = Router();

router.get("/", authMiddleware, tenantMiddleware, authorize("suppliers", "read"), asyncHandler(getSuppliers));
router.post("/", authMiddleware, tenantMiddleware, authorize("suppliers", "write"), asyncHandler(createSupplier));
router.get("/:id", authMiddleware, tenantMiddleware, validateObjectId(), authorize("suppliers", "read"), asyncHandler(getSupplierById));
router.put("/:id", authMiddleware, tenantMiddleware, validateObjectId(), authorize("suppliers", "write"), asyncHandler(updateSupplier));
router.put("/:id/restore", authMiddleware, tenantMiddleware, validateObjectId(), authorize("suppliers", "write"), asyncHandler(restoreSupplier));
router.delete("/:id", authMiddleware, tenantMiddleware, validateObjectId(), authorize("suppliers", "delete"), asyncHandler(softDeleteSupplier));
router.delete("/:id/hard", authMiddleware, isMaster, validateObjectId(), asyncHandler(hardDeleteSupplier));

export default router;
