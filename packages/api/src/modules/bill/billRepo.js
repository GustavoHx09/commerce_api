import bills from "./billModel.js";
import { baseQuery } from "../../shared/utils/repositoryHelpers.js";

export const createBillRepo = async (data, { session } = {}) => {
    const [created] = await bills.create([data], { session });
    return created;
};

export const getBillsRepo = (filter, skip, limit, sort) =>
    bills.find(filter).skip(skip).limit(limit).sort(sort)
        .populate("createdBy", "name")
        .populate("contactId", "name document");

export const countBillsRepo = (filter) => bills.countDocuments(filter);

export const getBillByIdRepo = (id, tenantId, includeDeleted = false, { session } = {}) =>
    bills.findOne({ _id: id, ...baseQuery(tenantId, includeDeleted) })
        .session(session)
        .populate("createdBy", "name")
        .populate("contactId", "name document");

export const updateBillRepo = (id, data, tenantId, { session } = {}) =>
    bills.findOneAndUpdate({ _id: id, ...baseQuery(tenantId, false) }, data, { new: true, session })
        .populate("contactId", "name document");

export const softDeleteBillRepo = (id, tenantId, { session } = {}) =>
    bills.findOneAndUpdate({ _id: id, ...baseQuery(tenantId, false) }, { deletedAt: new Date() }, { new: true, session });

export const restoreBillRepo = (id, tenantId, { session } = {}) =>
    bills.findOneAndUpdate({ _id: id, ...baseQuery(tenantId, true) }, { deletedAt: null }, { new: true, session });
