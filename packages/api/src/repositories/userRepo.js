import users from "../models/usersModel.js";

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

export const createUserRepo = (data) => users.create(data);

export const getUsersRepo = (filter, skip, limit, sort) => {
    return users.find(filter).skip(skip).limit(limit).sort(sort);
};

export const countUsersRepo = (filter) => users.countDocuments(filter);

export const getUserByIdRepo = (id, tenantId, includeDeleted = false) => {
    return users.findOne({ _id: id, ...baseQuery(tenantId, includeDeleted) });
};

export const getUserByIdWithPasswordRepo = (id, tenantId, includeDeleted = false) => {
    return users.findOne({ _id: id, ...baseQuery(tenantId, includeDeleted) }).select("+password");
};

export const getUserByEmailRepo = (email) => {
    return users.findOne({ email: email.toLowerCase(), deletedAt: null });
};

export const updateUserRepo = (id, data, tenantId) => {
    return users.findOneAndUpdate(
        { _id: id, ...baseQuery(tenantId, false) },
        data,
        { new: true }
    );
};

export const softDeleteUserRepo = (id, tenantId) => {
    return users.findOneAndUpdate(
        { _id: id, ...baseQuery(tenantId, false) },
        { deletedAt: new Date() },
        { new: true }
    );
};

export const hardDeleteUserRepo = (id) => {
    return users.findByIdAndDelete(id);
};
