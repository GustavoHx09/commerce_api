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
    'stock:read', 'stock:write', 'stock:supply', 'stock:adjust',
    'orders:read', 'orders:write', 'orders:delete',
    'cashier:read', 'cashier:write',
    'bills:read', 'bills:write', 'bills:delete',
    'payments:read',
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
  orders: 'Frente de caixa · PDV',
  cashier: 'Caixa',
  payments: 'Pagamentos',
  reports: 'Relatórios',
  audit: 'Auditoria',
};

// Rótulos amigáveis das ações disponíveis no catálogo.
// Permissões de base: o backend concede a todo usuário autenticado — não
// aparecem na grade de permissões nem podem ser revogadas.
export const BASELINE_PERMISSIONS = ['tenant:read'];

// Dependências de permissão: o que a permissão precisa para funcionar na
// prática — marcar uma delas ativa as necessárias junto na tela de permissões.
export const PERMISSION_DEPENDENCIES: Record<string, string[]> = {
  // Vender no PDV carrega catálogo, categorias e clientes, consulta o caixa
  // aberto e lê o tenant para saber o modo de caixa (por operador/compartilhado).
  'orders:write': [
    'products:read',
    'categories:read',
    'customers:read',
    'cashier:read',
    'cashier:write',
    'tenant:read',
  ],
  // Editar a empresa exige poder visualizar a tela "Minha empresa".
  'tenant:write': ['tenant:view'],
  // A tela de caixas lê o tenant para saber o modo de operação.
  'cashier:write': ['tenant:read'],
  // Liquidar conta passa pelo caixa aberto — a tela consulta o caixa.
  'bills:write': ['cashier:read'],
  // Movimentação manual de estoque acontece a partir da tela de produtos.
  'stock:supply': ['stock:read', 'products:read'],
  'stock:adjust': ['stock:read', 'products:read'],
  // Cadastrar produto exige escolher a categoria.
  'products:write': ['categories:read'],
};

// Retorna a permissão junto das dependências dela: escrever/excluir sempre
// implica a leitura do mesmo recurso — a tela nem aparece sem o :read.
export const permissionWithDependencies = (permission: string): string[] => {
  const [resource, action] = permission.split(':');
  const deps = new Set<string>([permission]);
  if (action && action !== 'read') deps.add(`${resource}:read`);
  (PERMISSION_DEPENDENCIES[permission] || []).forEach((dep) => deps.add(dep));
  return [...deps];
};

// Dependentes: permissões que deixam de funcionar se esta for desmarcada —
// desmarcar remove em cascata quem precisa dela (ex.: sem categories:read
// caem products:write e orders:write). Transitiva: a queda de uma arrasta
// os dependentes dela também.
export const permissionDependents = (permission: string): string[] => {
  const dependents = new Set<string>();
  const queue = [permission];
  while (queue.length) {
    const current = queue.shift()!;
    const [res, act] = current.split(':');
    // Regra geral: sem :read caem todas as ações de escrita do recurso.
    if (act === 'read') {
      ['write', 'delete', 'supply', 'adjust'].forEach((action) => {
        const dep = `${res}:${action}`;
        if (!dependents.has(dep)) {
          dependents.add(dep);
          queue.push(dep);
        }
      });
    }
    // Regra específica: quem aponta `current` em PERMISSION_DEPENDENCIES.
    Object.entries(PERMISSION_DEPENDENCIES).forEach(([perm, deps]) => {
      if (deps.includes(current) && !dependents.has(perm)) {
        dependents.add(perm);
        queue.push(perm);
      }
    });
  }
  dependents.delete(permission);
  return [...dependents];
};

export const ACTION_LABELS: Record<string, string> = {
  read: 'Leitura',
  view: 'Visualizar dados',
  write: 'Escrita',
  delete: 'Exclusão',
  adjust: 'Acerto de estoque',
  supply: 'Suprimento/retirada',
};

// Verifica no cliente se o usuário possui uma permissão (apenas para UX —
// o backend reforça a mesma regra via hasPermission). Considera curingas
// "*" e "recurso:*" vindos da lista efetiva retornada pela sessão.
export const hasPermission = (
  permissions: string[] | undefined,
  permission: string,
) => {
  const list = permissions || [];
  const resource = permission.split(':')[0];
  return (
    list.includes('*') ||
    list.includes(`${resource}:*`) ||
    list.includes(permission)
  );
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
  // A base entra por último: nem preset nem revogação a remove (espelha o
  // getPermissions do backend).
  BASELINE_PERMISSIONS.forEach((p) => effective.add(p));
  return effective;
};
