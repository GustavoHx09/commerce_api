import users from "../models/usersModel.js";

export const createUserRepo = (data) => {
    return users.create(data);
};

export const getUsersRepo = (filter) => {
    // busca os dados organizando pelo mais recente e utiliza o filtro quando tiver algum parâmetro
    return users
        .find(filter)
        .sort({ createdAt: -1 })
        .lean();
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