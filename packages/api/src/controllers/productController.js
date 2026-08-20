import {
    createProductService,
    getProductService,
    getProductByIdService,
    updateProductService,
    softDeleteProductService,
    hardDeleteProductService,
} from "../services/productService.js";
import { successResponse } from "../utils/responseHelpers.js";

export const createProduct = async (req, res) => {
    const product = await createProductService(req.body, req.tenantId);
    return successResponse(res, { product }, "Produto criado com sucesso", 201);
};

export const getProduct = async (req, res) => {
    const includeDeleted = req.user.role === "master" && req.query.includeDeleted === "true";
    const result = await getProductService(req.query, req.tenantId, includeDeleted);
    return successResponse(res, result, "Produtos listados com sucesso");
};

export const getProductById = async (req, res) => {
    const includeDeleted = req.user.role === "master" && req.query.includeDeleted === "true";
    const product = await getProductByIdService(req.params.id, req.tenantId, includeDeleted);

    if (!product) {
        const error = new Error("Produto não encontrado");
        error.statusCode = 404;
        throw error;
    }

    return successResponse(res, { product }, "Produto encontrado com sucesso");
};

export const updateProduct = async (req, res) => {
    const product = await updateProductService(req.params.id, req.body, req.tenantId);
    return successResponse(res, { product }, "Produto atualizado com sucesso");
};

export const softDeleteProduct = async (req, res) => {
    await softDeleteProductService(req.params.id, req.tenantId);
    return successResponse(res, null, "Produto removido com sucesso");
};

export const hardDeleteProduct = async (req, res) => {
    await hardDeleteProductService(req.params.id, req.user);
    return successResponse(res, null, "Produto deletado permanentemente");
};
