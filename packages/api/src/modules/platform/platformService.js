// Métricas consolidadas da plataforma para o painel exclusivo do master:
// totais gerais + uma linha por empresa com uso e faturamento.
import {
    getTenantsRepo,
    countUsersByTenantRepo,
    countProductsByTenantRepo,
    getSalesByTenantRepo,
} from "./platformRepo.js";

export const getPlatformMetricsService = async () => {
    const [tenants, usersByTenant, productsByTenant, salesByTenant] =
        await Promise.all([
            getTenantsRepo(),
            countUsersByTenantRepo(),
            countProductsByTenantRepo(),
            getSalesByTenantRepo(),
        ]);

    // Junta as agregações por tenantId em um mapa para lookup O(1).
    const indexOf = (rows) =>
        Object.fromEntries(rows.map((row) => [String(row._id), row]));
    const usersMap = indexOf(usersByTenant);
    const productsMap = indexOf(productsByTenant);
    const salesMap = indexOf(salesByTenant);

    const companies = tenants.map((tenant) => {
        const id = String(tenant._id);
        const sales = salesMap[id] || {};
        return {
            _id: tenant._id,
            name: tenant.displayName || tenant.name,
            isActive: tenant.isActive,
            createdAt: tenant.createdAt,
            users: usersMap[id]?.total || 0,
            products: productsMap[id]?.total || 0,
            orders: sales.orders || 0,
            revenue: sales.revenue || 0,
            lastOrderAt: sales.lastOrderAt || null,
        };
    });

    return {
        totals: {
            tenants: tenants.length,
            activeTenants: tenants.filter((t) => t.isActive !== false).length,
            users: companies.reduce((sum, c) => sum + c.users, 0),
            products: companies.reduce((sum, c) => sum + c.products, 0),
            orders: companies.reduce((sum, c) => sum + c.orders, 0),
            revenue: companies.reduce((sum, c) => sum + c.revenue, 0),
        },
        companies,
    };
};
