import suppliers from "./supplierModel.js";
import { baseQuery } from "../../shared/utils/repositoryHelpers.js";

export const createSupplierRepo = (data) => suppliers.create(data);
export const getSuppliersRepo = (filter, skip, limit, sort) =>
    suppliers.find(filter).skip(skip).limit(limit).sort(sort);
export const countSuppliersRepo = (filter) => suppliers.countDocuments(filter);
export const getSupplierByIdRepo = (id, tenantId, includeDeleted = false) =>
    suppliers.findOne({ _id: id, ...baseQuery(tenantId, includeDeleted) });
export const updateSupplierRepo = (id, data, tenantId) =>
    suppliers.findOneAndUpdate({ _id: id, ...baseQuery(tenantId, false) }, data, { new: true });
export const softDeleteSupplierRepo = (id, tenantId) =>
    suppliers.findOneAndUpdate({ _id: id, ...baseQuery(tenantId, false) }, { deletedAt: new Date() }, { new: true });
export const restoreSupplierRepo = (id, tenantId) =>
    suppliers.findOneAndUpdate({ _id: id, ...baseQuery(tenantId, true) }, { deletedAt: null }, { new: true });
export const hardDeleteSupplierRepo = (id) => suppliers.findByIdAndDelete(id);
