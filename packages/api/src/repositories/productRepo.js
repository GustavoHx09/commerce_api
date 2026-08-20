import products from "../models/productsModel.js";

export const baseQuery = (tenantId, includeDeleted = false) => {
    const query = {};

    if (tenantId) {
        query.tenantId = tenantId;
    }

    if (!includeDeleted) {
        query.deletedAt = null;
    }

    return query;
};

export const createProductRepo = (data) => products.create(data);

export const getProductsRepo = (filter, skip, limit, sort) => {
    return products.find(filter).skip(skip).limit(limit).sort(sort);
};

export const countProductsRepo = (filter) => products.countDocuments(filter);

export const getProductByIdRepo = (id, tenantId, includeDeleted = false) => {
    return products.findOne({ _id: id, ...baseQuery(tenantId, includeDeleted) });
};

export const updateProductRepo = (id, data, tenantId) => {
    return products.findOneAndUpdate(
        { _id: id, ...baseQuery(tenantId, false) },
        data,
        { new: true }
    );
};

export const softDeleteProductRepo = (id, tenantId) => {
    return products.findOneAndUpdate(
        { _id: id, ...baseQuery(tenantId, false) },
        { deletedAt: new Date() },
        { new: true }
    );
};

export const hardDeleteProductRepo = (id) => {
    return products.findByIdAndDelete(id);
};
