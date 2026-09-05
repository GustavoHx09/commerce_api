import products from "./productModel.js";
import { baseQuery } from "../../shared/utils/repositoryHelpers.js";

// Cria um novo produto no banco de dados.
export const createProductRepo = (data) => products.create(data);

// Retorna uma lista paginada de produtos com base no filtro.
export const getProductsRepo = (filter, skip, limit, sort) => {
    return products.find(filter).skip(skip).limit(limit).sort(sort);
};

// Conta o total de produtos que satisfazem o filtro.
export const countProductsRepo = (filter) => products.countDocuments(filter);

// Busca um produto pelo ID dentro do tenant e considerando soft delete.
export const getProductByIdRepo = (id, tenantId, includeDeleted = false) => {
    return products.findOne({ _id: id, ...baseQuery(tenantId, includeDeleted) });
};

// Atualiza um produto do tenant e retorna o documento atualizado.
export const updateProductRepo = (id, data, tenantId) => {
    return products.findOneAndUpdate(
        { _id: id, ...baseQuery(tenantId, false) },
        data,
        { new: true }
    );
};

// Realiza soft delete de um produto do tenant, definindo deletedAt.
export const softDeleteProductRepo = (id, tenantId) => {
    return products.findOneAndUpdate(
        { _id: id, ...baseQuery(tenantId, false) },
        { deletedAt: new Date() },
        { new: true }
    );
};

// Restaura um produto previamente excluído por soft delete.
export const restoreProductRepo = (id, tenantId) => {
    return products.findOneAndUpdate(
        { _id: id, ...baseQuery(tenantId, true) },
        { deletedAt: null },
        { new: true }
    );
};

// Remove permanentemente um produto do banco de dados.
export const hardDeleteProductRepo = (id) => {
    return products.findByIdAndDelete(id);
};
