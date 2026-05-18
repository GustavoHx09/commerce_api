import company from "../models/companyModel.js";

export const createCompanyRepo = (data) => {
    return company.create(data);
};

export const getCompanyRepo = (filter) => {
    // busca os dados organizando pelo mais recente e utiliza o filtro quando tiver algum parâmetro
    return company
        .find(filter)
        .sort({ createdAt: -1 })
        .lean();
};

export const getCompanyByIdRepo = (id) => {
    return company.findById(id);
};

export const updateCompanyRepo = (id, data) => {
    return company.findByIdAndUpdate(id, data, { new: true });
};

export const deleteCompanyRepo = (id) => {
    return company.findByIdAndDelete(id);
};