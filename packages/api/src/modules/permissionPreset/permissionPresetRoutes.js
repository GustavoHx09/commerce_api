// Rotas de gerenciamento de presets de permissões.
import { Router } from "express";
import {
    createPermissionPreset,
    getPermissionPresets,
    getPermissionPresetById,
    updatePermissionPreset,
    softDeletePermissionPreset,
    restorePermissionPreset,
    getAvailablePermissionsController,
} from "./permissionPresetController.js";
import { authMiddleware, tenantMiddleware } from "../../shared/middlewares/authMiddleware.js";
import { authorize } from "../../shared/middlewares/authorizeMiddleware.js";
import { validateObjectId } from "../../shared/middlewares/validateObjectId.js";
import { asyncHandler } from "../../shared/middlewares/asyncHandler.js";

const router = Router();

router.get("/available-permissions", authMiddleware, asyncHandler(getAvailablePermissionsController));

router.get("/", authMiddleware, tenantMiddleware, authorize("permissionPresets", "read"), asyncHandler(getPermissionPresets));
router.post("/", authMiddleware, tenantMiddleware, authorize("permissionPresets", "write"), asyncHandler(createPermissionPreset));
router.get("/:id", authMiddleware, tenantMiddleware, validateObjectId(), authorize("permissionPresets", "read"), asyncHandler(getPermissionPresetById));
router.put("/:id", authMiddleware, tenantMiddleware, validateObjectId(), authorize("permissionPresets", "write"), asyncHandler(updatePermissionPreset));
router.delete("/:id", authMiddleware, tenantMiddleware, validateObjectId(), authorize("permissionPresets", "delete"), asyncHandler(softDeletePermissionPreset));
router.put("/:id/restore", authMiddleware, tenantMiddleware, validateObjectId(), authorize("permissionPresets", "write"), asyncHandler(restorePermissionPreset));

export default router;
