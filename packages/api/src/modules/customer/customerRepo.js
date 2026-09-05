import customers from "./customerModel.js";
import { baseQuery } from "../../shared/utils/repositoryHelpers.js";

export const createCustomerRepo = async (data, { session } = {}) => {
    const [created] = await customers.create([data], { session });
    return created;
};
export const getCustomersRepo = (filter, skip, limit, sort) =>
    customers.find(filter).skip(skip).limit(limit).sort(sort);
export const countCustomersRepo = (filter) => customers.countDocuments(filter);
export const getCustomerByIdRepo = (id, tenantId, includeDeleted = false, { session } = {}) =>
    customers.findOne({ _id: id, ...baseQuery(tenantId, includeDeleted) }).session(session);
export const updateCustomerRepo = (id, data, tenantId, { session } = {}) =>
    customers.findOneAndUpdate({ _id: id, ...baseQuery(tenantId, false) }, data, { new: true, session });
export const softDeleteCustomerRepo = (id, tenantId, { session } = {}) =>
    customers.findOneAndUpdate({ _id: id, ...baseQuery(tenantId, false) }, { deletedAt: new Date() }, { new: true, session });
export const restoreCustomerRepo = (id, tenantId, { session } = {}) =>
    customers.findOneAndUpdate({ _id: id, ...baseQuery(tenantId, true) }, { deletedAt: null }, { new: true, session });
export const hardDeleteCustomerRepo = (id, { session } = {}) => customers.findByIdAndDelete(id, { session });
