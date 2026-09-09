import payments from "./paymentModel.js";
import { baseQuery } from "../../shared/utils/repositoryHelpers.js";

export const createPaymentRepo = async (data, { session } = {}) => {
    const [created] = await payments.create([data], { session });
    return created;
};

export const getPaymentsRepo = (filter, skip, limit, sort) =>
    payments.find(filter).skip(skip).limit(limit).sort(sort).populate("createdBy", "name");

export const countPaymentsRepo = (filter) => payments.countDocuments(filter);

export const getPaymentByIdRepo = (id, tenantId, { session } = {}) =>
    payments.findOne({ _id: id, ...baseQuery(tenantId, false) }).session(session);

export const updatePaymentRepo = (id, data, tenantId, { session } = {}) =>
    payments.findOneAndUpdate({ _id: id, ...baseQuery(tenantId, false) }, data, { new: true, session });

export const cancelPaymentsByOrderRepo = (orderId, tenantId, actorId, { session } = {}) =>
    payments.updateMany(
        { orderId, tenantId, status: { $ne: "canceled" } },
        { status: "canceled", canceledAt: new Date(), canceledBy: actorId },
        { session }
    );
