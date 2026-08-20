import tenants from "../models/tenantsModel.js";

// Cria um novo tenant no banco de dados.
export const createTenantRepo = (data) => tenants.create(data);

// Retorna uma lista paginada de tenants com base no filtro.
export const getTenantsRepo = (filter, skip, limit, sort) => {
    return tenants.find(filter).skip(skip).limit(limit).sort(sort);
};

// Conta o total de tenants que satisfazem o filtro.
export const countTenantsRepo = (filter) => tenants.countDocuments(filter);

// Busca um tenant pelo ID.
export const getTenantByIdRepo = (id) => tenants.findById(id);

// Busca um tenant ativo pelo slug.
export const getTenantBySlugRepo = (slug) => tenants.findOne({ slug, isActive: true });

// Atualiza um tenant e retorna o documento atualizado.
export const updateTenantRepo = (id, data) => tenants.findByIdAndUpdate(id, data, { new: true });

// Remove permanentemente um tenant do banco de dados.
export const deleteTenantRepo = (id) => tenants.findByIdAndDelete(id);
