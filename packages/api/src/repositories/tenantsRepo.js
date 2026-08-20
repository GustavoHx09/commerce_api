import tenants from "../models/tenantsModel.js";

export const createTenantRepo = (data) => tenants.create(data);

export const getTenantsRepo = (filter, skip, limit, sort) => {
    return tenants.find(filter).skip(skip).limit(limit).sort(sort);
};

export const countTenantsRepo = (filter) => tenants.countDocuments(filter);

export const getTenantByIdRepo = (id) => tenants.findById(id);

export const getTenantBySlugRepo = (slug) => tenants.findOne({ slug, isActive: true });

export const updateTenantRepo = (id, data) => tenants.findByIdAndUpdate(id, data, { new: true });

export const deleteTenantRepo = (id) => tenants.findByIdAndDelete(id);
