import { Router } from "express";
import {
    createCustomer,
    getCustomers,
    getCustomerById,
    updateCustomer,
    softDeleteCustomer,
    hardDeleteCustomer,
    restoreCustomer,
} from "./customerController.js";
import { authMiddleware, tenantMiddleware, isMaster } from "../../shared/middlewares/authMiddleware.js";
import { authorize } from "../../shared/middlewares/authorizeMiddleware.js";
import { validateObjectId } from "../../shared/middlewares/validateObjectId.js";
import { asyncHandler } from "../../shared/middlewares/asyncHandler.js";

const router = Router();

router.get("/", authMiddleware, tenantMiddleware, authorize("customers", "read"), asyncHandler(getCustomers));
router.post("/", authMiddleware, tenantMiddleware, authorize("customers", "write"), asyncHandler(createCustomer));
router.get("/:id", authMiddleware, tenantMiddleware, validateObjectId(), authorize("customers", "read"), asyncHandler(getCustomerById));
router.put("/:id", authMiddleware, tenantMiddleware, validateObjectId(), authorize("customers", "write"), asyncHandler(updateCustomer));
router.put("/:id/restore", authMiddleware, tenantMiddleware, validateObjectId(), authorize("customers", "write"), asyncHandler(restoreCustomer));
router.delete("/:id", authMiddleware, tenantMiddleware, validateObjectId(), authorize("customers", "delete"), asyncHandler(softDeleteCustomer));
router.delete("/:id/hard", authMiddleware, isMaster, validateObjectId(), asyncHandler(hardDeleteCustomer));

export default router;
