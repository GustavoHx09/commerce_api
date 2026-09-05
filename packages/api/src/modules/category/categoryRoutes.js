// Rotas de gerenciamento de categorias de produtos.
import { Router } from "express";
import {
    createCategory,
    getCategories,
    getCategoryById,
    updateCategory,
    softDeleteCategory,
    hardDeleteCategory,
    restoreCategory,
} from "./categoryController.js";
import { authMiddleware, tenantMiddleware, isMaster } from "../../shared/middlewares/authMiddleware.js";
import { authorize } from "../../shared/middlewares/authorizeMiddleware.js";
import { validateObjectId } from "../../shared/middlewares/validateObjectId.js";
import { asyncHandler } from "../../shared/middlewares/asyncHandler.js";

const router = Router();

router.get("/", authMiddleware, tenantMiddleware, authorize("categories", "read"), asyncHandler(getCategories));
router.post("/", authMiddleware, tenantMiddleware, authorize("categories", "write"), asyncHandler(createCategory));
router.get("/:id", authMiddleware, tenantMiddleware, validateObjectId(), authorize("categories", "read"), asyncHandler(getCategoryById));
router.put("/:id", authMiddleware, tenantMiddleware, validateObjectId(), authorize("categories", "write"), asyncHandler(updateCategory));
router.put("/:id/restore", authMiddleware, tenantMiddleware, validateObjectId(), authorize("categories", "write"), asyncHandler(restoreCategory));
router.delete("/:id", authMiddleware, tenantMiddleware, validateObjectId(), authorize("categories", "delete"), asyncHandler(softDeleteCategory));
router.delete("/:id/hard", authMiddleware, isMaster, validateObjectId(), asyncHandler(hardDeleteCategory));

export default router;
