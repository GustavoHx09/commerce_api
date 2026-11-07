import { Router } from "express";
import { authMiddleware, isMaster } from "../../shared/middlewares/authMiddleware.js";
import { asyncHandler } from "../../shared/middlewares/asyncHandler.js";
import { getPlatformMetrics } from "./platformController.js";

// Painel da plataforma: visão cross-tenant, restrita ao usuário master.
const router = Router();

router.get("/metrics", authMiddleware, isMaster, asyncHandler(getPlatformMetrics));

export default router;
