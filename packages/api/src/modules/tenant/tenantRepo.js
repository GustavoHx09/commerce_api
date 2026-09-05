import tenants from "./tenantModel.js";

// Cria um novo tenant no banco de dados.
export const createTenantRepo = (data) => tenants.create(data);

// Retorna uma lista paginada de tenants com base no filtro.
export const getTenantsRepo = (filter, skip, limit, sort) => {
    return tenants.find(filter).skip(skip).limit(limit).sort(sort);
};

// Conta o total de tenants que satisfazem o filtro.
export const countTenantsRepo = (filter) => tenants.countDocuments(filter);

// Busca um tenant pelo ID, ignorando registros excluídos por padrão.
export const getTenantByIdRepo = (id, includeDeleted = false) => {
    const filter = { _id: id };
    if (!includeDeleted) filter.deletedAt = null;
    return tenants.findOne(filter);
};

// Busca um tenant ativo pelo slug.
export const getTenantBySlugRepo = (slug) => tenants.findOne({ slug, isActive: true, deletedAt: null });

// Busca um tenant ativo pelo documento (CPF/CNPJ).
export const getTenantByDocumentRepo = (document) => tenants.findOne({ document, deletedAt: null });

// Atualiza um tenant e retorna o documento atualizado.
export const updateTenantRepo = (id, data) => {
    return tenants.findOneAndUpdate({ _id: id, deletedAt: null }, data, { new: true });
};

// Realiza soft delete de um tenant.
export const softDeleteTenantRepo = (id) => {
    return tenants.findByIdAndUpdate(id, { deletedAt: new Date(), isActive: false }, { new: true });
};

// Remove permanentemente um tenant do banco de dados.
export const deleteTenantRepo = (id) => tenants.findByIdAndDelete(id);
