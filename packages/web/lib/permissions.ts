// Utilitários de permissões do frontend. O backend (SYSTEM_PERMISSIONS e
// defaultRolePermissions em permissionHelpers.js) é a fonte de verdade;
// estas constantes espelham o catálogo apenas para montar a interface.

// Permissões padrão de cada role quando o usuário não tem preset vinculado.
// Espelha defaultRolePermissions do backend para exibir a origem "cargo".
export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  master: ['*'],
  admin: [
    'dashboard:read',
    'tenant:read', 'tenant:write',
    'users:read', 'users:write', 'users:delete',
    'permissionPresets:read', 'permissionPresets:write', 'permissionPresets:delete',
    'products:read', 'products:write', 'products:delete',
    'categories:read', 'categories:write', 'categories:delete',
    'customers:read', 'customers:write', 'customers:delete',
    'suppliers:read', 'suppliers:write', 'suppliers:delete',
    'stock:read', 'stock:write',
    'orders:read', 'orders:write', 'orders:delete',
    'cashier:read', 'cashier:write',
    'reports:read',
    'audit:read',
  ],
  user: [
    'dashboard:read',
    'tenant:read',
    'products:read', 'products:write',
    'customers:read', 'customers:write',
    'orders:read', 'orders:write',
    'cashier:read', 'cashier:write',
  ],
};

// Rótulos amigáveis dos recursos do catálogo para exibição no painel.
export const RESOURCE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  tenant: 'Empresa',
  users: 'Usuários',
  permissionPresets: 'Presets de permissões',
  products: 'Produtos',
  categories: 'Categorias',
  customers: 'Clientes',
  suppliers: 'Fornecedores',
  bills: 'Contas a pagar/receber',
  stock: 'Estoque',
  orders: 'Pedidos/Vendas',
  cashier: 'Caixa',
  payments: 'Pagamentos',
  reports: 'Relatórios',
  audit: 'Auditoria',
};

// Rótulos amigáveis das ações disponíveis no catálogo.
export const ACTION_LABELS: Record<string, string> = {
  read: 'Leitura',
  write: 'Escrita',
  delete: 'Exclusão',
};

// Agrupa as permissões do catálogo por recurso mantendo a ordem de chegada.
export const groupPermissionsByResource = (permissions: string[]) => {
  const groups = new Map<string, string[]>();

  for (const permission of permissions) {
    const resource = permission.split(':')[0];
    const list = groups.get(resource) || [];
    list.push(permission);
    groups.set(resource, list);
  }

  return Array.from(groups.entries()).map(([resource, perms]) => ({
    resource,
    label: RESOURCE_LABELS[resource] || resource,
    permissions: perms,
  }));
};

// Calcula as permissões efetivas no cliente para pré-visualizar o resultado:
// efetivas = (preset ?? defaults do cargo) ∪ extras − revogadas.
export const computeEffectivePermissions = (
  base: string[],
  extras: string[],
  revoked: string[],
) => {
  const effective = new Set(base);
  extras.forEach((p) => effective.add(p));
  revoked.forEach((p) => effective.delete(p));
  return effective;
};
