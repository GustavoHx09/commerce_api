import orders from "./orderModel.js";
import { baseQuery } from "../../shared/utils/repositoryHelpers.js";

export const createOrderRepo = async (data, { session } = {}) => {
    const [created] = await orders.create([data], { session });
    return created;
};

export const getOrdersRepo = (filter, skip, limit, sort) =>
    orders.find(filter).skip(skip).limit(limit).sort(sort)
        .populate("customerId", "name document")
        .populate("cashierId", "openedBy status")
        .populate("paymentIds");

export const countOrdersRepo = (filter) => orders.countDocuments(filter);

export const getOrderByIdRepo = (id, tenantId, includeDeleted = false, { session } = {}) =>
    orders.findOne({ _id: id, ...baseQuery(tenantId, includeDeleted) })
        .session(session)
        .populate("customerId", "name document")
        .populate("cashierId", "openedBy status")
        .populate("paymentIds");

export const updateOrderRepo = (id, data, tenantId, { session } = {}) =>
    orders.findOneAndUpdate({ _id: id, ...baseQuery(tenantId, false) }, data, { new: true, session });

export const getPaidOrdersTotalByCashier = async (cashierId, tenantId, { session } = {}) => {
    const result = await orders.aggregate([
        { $match: { cashierId, tenantId, status: "paid", deletedAt: null } },
        { $group: { _id: null, total: { $sum: "$total" } } },
    ]).session(session);

    return result[0]?.total || 0;
};

export const countOrdersByProductRepo = (productId) => orders.countDocuments({ "items.productId": productId });
export const countOrdersByCustomerRepo = (customerId) => orders.countDocuments({ customerId });
export const countOrdersByCashierRepo = (cashierId) => orders.countDocuments({ cashierId });
