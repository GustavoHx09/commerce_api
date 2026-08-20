import {
    createProductService,
    getProductsService,
    getProductByIdService,
    updateProductService,
    softDeleteProductService,
    hardDeleteProductService,
} from "../services/productService.js";
import { successResponse } from "../utils/responseHelpers.js";
import { ensureFound } from "../utils/controllerHelpers.js";

// Cria um novo produto vinculado ao tenant atual.
export const createProduct = async (req, res) => {
    const product = await createProductService(req.body, req.tenantId);
    return successResponse(res, { product }, "Produto criado com sucesso", 201);
};

// Lista produtos do tenant atual com paginação e filtros.
export const getProduct = async (req, res) => {
    const includeDeleted = req.user.role === "master" && req.query.includeDeleted === "true";
    const result = await getProductsService(req.query, req.tenantId, includeDeleted);
    return successResponse(res, result, "Produtos listados com sucesso");
};

// Busca um produto específico pelo ID dentro do tenant atual.
export const getProductById = async (req, res) => {
    const includeDeleted = req.user.role === "master" && req.query.includeDeleted === "true";
    const product = await getProductByIdService(req.params.id, req.tenantId, includeDeleted);
    ensureFound(product, "Produto");
    return successResponse(res, { product }, "Produto encontrado com sucesso");
};

// Atualiza os dados de um produto existente.
export const updateProduct = async (req, res) => {
    const product = await updateProductService(req.params.id, req.body, req.tenantId);
    return successResponse(res, { product }, "Produto atualizado com sucesso");
};

// Realiza soft delete de um produto do tenant atual.
export const softDeleteProduct = async (req, res) => {
    await softDeleteProductService(req.params.id, req.tenantId);
    return successResponse(res, null, "Produto removido com sucesso");
};

// Realiza hard delete permanente de um produto. Restrito a master.
export const hardDeleteProduct = async (req, res) => {
    await hardDeleteProductService(req.params.id, req.user);
    return successResponse(res, null, "Produto deletado permanentemente");
};
