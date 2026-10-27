import mongoose from "mongoose";
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

// Soma os pagamentos efetivados (status "paid") de um caixa agrupados por
// método. O dinheiro desconta o troco registrado na venda (order.change),
// pois o valor pago em cash pode ser maior que o total cobrado.
export const getCashierPaymentTotalsRepo = (cashierId, tenantId) =>
    payments.aggregate([
        { $match: { cashierId: new mongoose.Types.ObjectId(String(cashierId)), ...baseQuery(tenantId, false), status: "paid" } },
        {
            $lookup: {
                from: "orders",
                localField: "orderId",
                foreignField: "_id",
                as: "order",
            },
        },
        { $unwind: { path: "$order", preserveNullAndEmptyArrays: true } },
        {
            $group: {
                _id: "$method",
                total: {
                    $sum: {
                        $cond: [
                            { $eq: ["$method", "cash"] },
                            { $subtract: ["$amount", { $ifNull: ["$order.change", 0] }] },
                            "$amount",
                        ],
                    },
                },
            },
        },
    ]);
