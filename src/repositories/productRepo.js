import products from "../models/productsModel.js";

export const createProductRepo = (data) => {
    return products.create(data);
};

export const getProductsRepo = () => {
    return products.find();
};

export const getProductByIdRepo = (id) => {
    return products.findById(id);
};

export const updateProductRepo = (id, data) => {
    return products.findByIdAndUpdate(id, data, { new: true });
};

export const deleteProductRepo = (id) => {
    return products.findByIdAndDelete(id);
};