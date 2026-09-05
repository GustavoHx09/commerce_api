import cashiers from "./cashierModel.js";
import cashierMovements from "./cashierMovementModel.js";
import { baseQuery } from "../../shared/utils/repositoryHelpers.js";

export const createCashierRepo = async (data, { session } = {}) => {
    const [created] = await cashiers.create([data], { session });
    return created;
};

export const getCashiersRepo = (filter, skip, limit, sort) =>
    cashiers.find(filter).skip(skip).limit(limit).sort(sort).populate("openedBy", "name").populate("closedBy", "name");

export const countCashiersRepo = (filter) => cashiers.countDocuments(filter);

export const getCashierByIdRepo = (id, tenantId, includeDeleted = false, { session } = {}) =>
    cashiers.findOne({ _id: id, ...baseQuery(tenantId, includeDeleted) }).session(session);

export const getOpenCashierByUserRepo = (tenantId, userId, { session } = {}) =>
    cashiers.findOne({ tenantId, openedBy: userId, status: "open", deletedAt: null }).session(session);

export const updateCashierRepo = (id, data, tenantId, { session } = {}) =>
    cashiers.findOneAndUpdate({ _id: id, ...baseQuery(tenantId, true) }, data, { new: true, session });

export const softDeleteCashierRepo = (id, tenantId, { session } = {}) =>
    cashiers.findOneAndUpdate({ _id: id, ...baseQuery(tenantId, false) }, { deletedAt: new Date() }, { new: true, session });

export const restoreCashierRepo = (id, tenantId, { session } = {}) =>
    cashiers.findOneAndUpdate({ _id: id, ...baseQuery(tenantId, true) }, { deletedAt: null }, { new: true, session });

export const hardDeleteCashierRepo = (id, { session } = {}) =>
    cashiers.findByIdAndDelete(id, { session });

export const createCashierMovementRepo = async (data, { session } = {}) => {
    const [created] = await cashierMovements.create([data], { session });
    return created;
};

export const getCashierMovementsRepo = (filter, skip, limit, sort) =>
    cashierMovements.find(filter).skip(skip).limit(limit).sort(sort).populate("createdBy", "name");

export const countCashierMovementsRepo = (filter) => cashierMovements.countDocuments(filter);
