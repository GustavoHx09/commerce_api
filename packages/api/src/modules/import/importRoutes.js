// Rotas de importação em massa por arquivo. Cada recurso exige a permissão
// :write da entidade importada — resolvida dinamicamente pelo :resource.
import { Router } from 'express';
import { importResource } from './importController.js';
import { authMiddleware, tenantMiddleware } from '../../shared/middlewares/authMiddleware.js';
import { authorize } from '../../shared/middlewares/authorizeMiddleware.js';
import { uploadImport } from '../../shared/utils/upload/multerConfig.js';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.js';
import { throwValidationError } from '../../shared/utils/serviceHelpers.js';

// Permissão de escrita exigida por recurso importável.
const RESOURCE_PERMISSIONS = {
    products: "products",
    categories: "categories",
    customers: "customers",
    suppliers: "suppliers",
};

// Resolve a permissão conforme o :resource da URL — o authorize fixo não
// serve porque cada entidade tem sua própria permissão de escrita.
const authorizeImport = (req, _res, next) => {
    const resource = RESOURCE_PERMISSIONS[req.params.resource];
    if (!resource) throwValidationError("Recurso inválido para importação.");
    return authorize(resource, "write")(req, _res, next);
};

const router = Router();

router.post('/:resource', authMiddleware, tenantMiddleware, authorizeImport, uploadImport, asyncHandler(importResource));

export default router;
