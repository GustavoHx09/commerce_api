import {
    createProductRepo,
    getProductsRepo,
    getProductByIdRepo,
    updateProductRepo,
    deleteProductRepo
} from "../repositories/productRepo.js";

export const createProductService = async (data) => {

    // se caso o campo vier vazio OU faltando ele NÃO salva
    if (data.name === "" || !data.name) {
        const error = new Error("Campo 'name' não foi definido ou está faltando!");
        error.statusCode = 400;
        throw error;
    } if (data.price === "" || !data.price) {
        const error = new Error("Campo 'price' não foi definido ou está faltando!");
        error.statusCode = 400;
        throw error;
    } if (data.quantityInStock === "" || !data.quantityInStock) {
        const error = new Error("Campo 'quantityInStock' não foi definido ou está faltando!");
        error.statusCode = 400;
        throw error;
    } if (data.category === "" || !data.category) {
        const error = new Error("Campo 'category' não foi definido ou está faltando!");
        error.statusCode = 400;
        throw error;
    }

    return await createProductRepo(data);
};

export const getProductService = async () => {
    // regra de negócio
    return await getProductsRepo();
};

export const getProductByIdService = async (id) => {
    // regra de negócio
    return await getProductByIdRepo(id);
};

export const updateProductService = async (id, data) => {

    // se caso o campo vier vazio ele NÃO altera
    if (data.name === "") {
        delete data.name;
    } if (data.description === "") {
        delete data.description;
    } if (data.price === null) {
        delete data.price;
    } if (data.quantityInStock === null) {
        delete data.quantityInStock;
    } if (data.category === "") {
        delete data.category;
    }

    console.log(data);

    return await updateProductRepo(id, data);
};

export const deleteProductService = async (id) => {
    // regra de negócio
    return await deleteProductRepo(id);
};