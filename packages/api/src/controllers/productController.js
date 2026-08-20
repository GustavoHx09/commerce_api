import {
    createProductService,
    getProductService,
    getProductByIdService,
    updateProductService,
    deleteProductService
} from "../services/productService.js";

// Criar produto
export const createProduct = async (req, res) => {
    try {
        const data = req.body;

        const product = await createProductService(data);

        return res.status(201).json({
            message: "Produto criado com sucesso",
            product
        });

    } catch (error) {
        return res.status(500).json({
            message: "Erro ao criar produto",
            error: error.message
        });
    }
};

// Atualizar produto
export const updateProduct = async (req, res) => {
    try {
        const id = req.params.id;
        const data = req.body;
        const product = await updateProductService(
            id,
            data,
            { new: true }
        );

        return res.status(200).json({
            message: "Produto atualizado com sucesso",
            product
        });

    } catch (error) {
        return res.status(500).json({
            message: "Erro ao atualizar produto",
            error: error.message
        });
    }
};

// Deletar usuario
export const deleteProduct = async (req, res) => {
    try {
        const id = req.params.id;

        await deleteProductService(id);

        return res.status(200).json({
            message: "Produto deletado com sucesso"
        });

    } catch (error) {
        return res.status(500).json({
            message: "Erro ao deletar produto",
            error: error.message
        });
    }
};

// Buscar todos
export const getProduct = async (req, res) => {
    try {
        const product = await getProductService();

        return res.status(200).json({
            message: "Produtos listado com sucesso",
            product
        });

    } catch (error) {
        return res.status(500).json({
            message: "Erro ao listar produto",
            error: error.message
        });
    }
};

// Buscar por id
export const getProductById = async (req, res) => {
    try {
        const id = req.params.id;

        const product = await getProductByIdService(id);

        if (!product) {
            return res.status(404).json({
                message: "Produto não encontrado"
            });
        }

        return res.status(200).json({
            message: "Produto encontrado com sucesso",
            product
        });

    } catch (error) {
        return res.status(500).json({
            message: "Erro ao buscar produto",
            error: error.message
        });
    }
};