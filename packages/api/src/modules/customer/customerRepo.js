import customers from "./customerModel.js";
import { baseQuery } from "../../shared/utils/repositoryHelpers.js";

export const createCustomerRepo = (data) => customers.create(data);
export const getCustomersRepo = (filter, skip, limit, sort) =>
    customers.find(filter).skip(skip).limit(limit).sort(sort);
export const countCustomersRepo = (filter) => customers.countDocuments(filter);
export const getCustomerByIdRepo = (id, tenantId, includeDeleted = false) =>
    customers.findOne({ _id: id, ...baseQuery(tenantId, includeDeleted) });
export const updateCustomerRepo = (id, data, tenantId) =>
    customers.findOneAndUpdate({ _id: id, ...baseQuery(tenantId, false) }, data, { new: true });
export const softDeleteCustomerRepo = (id, tenantId) =>
    customers.findOneAndUpdate({ _id: id, ...baseQuery(tenantId, false) }, { deletedAt: new Date() }, { new: true });
export const restoreCustomerRepo = (id, tenantId) =>
    customers.findOneAndUpdate({ _id: id, ...baseQuery(tenantId, true) }, { deletedAt: null }, { new: true });
export const hardDeleteCustomerRepo = (id) => customers.findByIdAndDelete(id);
