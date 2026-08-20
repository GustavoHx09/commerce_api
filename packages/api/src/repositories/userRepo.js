import users from "../models/usersModel.js";

export const createUserRepo = (data) => {
    return users.create(data);
};

export const getUsersRepo = () => {
    return users.find();
};

export const getUserByIdRepo = (id) => {
    return users.findById(id);
};

export const updateUserRepo = (id, data) => {
    return users.findByIdAndUpdate(id, data, { new: true });
};

export const deleteUserRepo = (id) => {
    return users.findByIdAndDelete(id);
};