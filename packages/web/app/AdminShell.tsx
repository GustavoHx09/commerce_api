'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from './context/AuthContext';
import { hasPermission } from '@/lib/permissions';

// Quarto item de cada entrada: permissão de leitura exigida para o item
// aparecer no menu — null significa visível para qualquer usuário logado.
export const navigation = [
  {
    title: 'Visão geral',
    items: [['/dashboard', 'Dashboard', 'DG', 'dashboard:read']],
  },
  {
    title: 'Operação',
    items: [
      ['/management/pos', 'Frente de caixa · PDV', 'PV', 'orders:write'],
      ['/management/orders', 'Vendas e pedidos', 'VD', 'orders:read'],
      ['/management/cashiers', 'Caixas', 'CX', 'cashier:read'],
    ],
  },
  {
    title: 'Cadastros',
    items: [
      ['/management/products', 'Estoque', 'ES', 'products:read'],
      ['/management/customers', 'Clientes', 'CL', 'customers:read'],
      ['/management/suppliers', 'Fornecedores', 'FR', 'suppliers:read'],
      ['/management/users', 'Funcionários', 'FN', 'users:read'],
    ],
  },
  {
    title: 'Financeiro',
    items: [
      ['/management/payables', 'Contas a pagar', 'CP', 'bills:read'],
      ['/management/receivables', 'Contas a receber', 'CR', 'bills:read'],
    ],
  },
  {
    title: 'Gestão',
    items: [
      ['/management/reports', 'Relatórios', 'RL', 'reports:read'],
      ['/management/company', 'Minha empresa', 'EM', 'tenant:view'],
      ['/management/audit', 'Auditoria', 'AU', 'audit:read'],
      ['/management/exports', 'Importação e exportação', 'IE', 'reports:read'],
      ['/management/account', 'Minha conta', 'MC', null],
    ],
  },
] as const;

// Permissão de leitura por rota — o mapa nasce do menu e recebe as telas
// fora da navegação (presets e categorias, acessadas por links internos).
const routePermissions: Record<string, string> = {
  ...Object.fromEntries(
    navigation
      .flatMap((group) => group.items as unknown as string[][])
      .filter((item) => item[3])
      .map((item) => [item[0], item[3]])
  ),
  '/management/presets': 'permissionPresets:read',
  '/management/categories': 'categories:read',
};

// Master acessa tudo; demais usuários seguem as permissões efetivas.
const allowed = (role: string | undefined, permissions: string[] | undefined, required: string | null) =>
  !required || role === 'master' || hasPermission(permissions, required);

const WorkspaceContext = createContext('');

export function useWorkspaceApi() {
  const tenantId = useContext(WorkspaceContext);
  const client = useMemo(
    () =>
      axios.create({
        baseURL: process.env.NEXT_PUBLIC_API_URL,
        withCredentials: true,
        params: tenantId ? { tenantId } : {},
      }),
    [tenantId]
  );
  return { client, tenantId };
}

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, tenant, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [closedGroups, setClosedGroups] = useState<string[]>([]);
  const [companies, setCompanies] = useState<{ _id: string; name: string }[]>(
    []
  );
  const [selectedTenant, setSelectedTenant] = useState('');
  const [companyError, setCompanyError] = useState('');
  const publicPage = [
    '/',
    '/login',
    '/forgot-password',
    '/reset-password',
  ].includes(pathname);

  useEffect(() => {
    if (!publicPage && !isLoading && !user) router.replace('/login');
  }, [publicPage, isLoading, user, router]);

  useEffect(() => {
    if (user?.role !== 'master' || publicPage) return;
    let active = true;
    const load = async () => {
      try {
        const all: { _id: string; name: string }[] = [];
        let page = 1;
        let totalPages = 1;
        do {
          const response = await axios.get(
            `${process.env.NEXT_PUBLIC_API_URL}/tenants`,
            { withCredentials: true, params: { page, limit: 100 } }
          );
          all.push(...response.data.data.data);
          totalPages = response.data.data.pagination.totalPages;
          page++;
        } while (page <= totalPages);
        if (active) setCompanies(all);
      } catch {
        if (active) setCompanyError('Não foi possível listar as empresas.');
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [user, publicPage]);

  if (publicPage) return children;
  if (isLoading || !user)
    return (
      <main className="grid min-h-screen place-items-center">
        Carregando sessão...
      </main>
    );
  const currentTitle =
    navigation
      .flatMap((group) => group.items as unknown as string[][])
      .find((item) => item[0] === pathname)?.[1] || 'Painel administrativo';
  const workspace =
    user.role === 'master' ? selectedTenant : user.tenantId || '';
  // Identidade da empresa no menu lateral: logo (quando enviada) ou a
  // inicial do nome de exibição — o "S" fixo vira fallback da plataforma.
  const companyLabel =
    tenant?.displayName || tenant?.name || 'Stock-ly';

  return (
    <WorkspaceContext.Provider value={workspace}>
      <div className="min-h-screen bg-slate-50">
        {mobileOpen && (
          <button
            className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden"
            aria-label="Fechar menu"
            onClick={() => setMobileOpen(false)}
          />
        )}
        <aside
          id="admin-navigation"
          className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-800 bg-slate-950 text-slate-300 transition-all ${collapsed ? 'lg:w-20' : 'lg:w-64'} w-64 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        >
          <div className="flex h-20 shrink-0 items-center justify-between border-b border-slate-800 px-4">
            <Link
              href="/dashboard"
              title={companyLabel}
              className="flex min-w-0 items-center gap-3 font-bold text-white"
            >
              {tenant?.logoUrl ? (
                <Image
                  src={tenant.logoUrl}
                  alt={companyLabel}
                  width={40}
                  height={40}
                  unoptimized
                  className="h-10 w-10 shrink-0 rounded-xl bg-white object-contain p-1"
                />
              ) : (
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-600 text-lg">
                  {companyLabel.charAt(0).toUpperCase()}
                </span>
              )}
              <span className={`truncate ${collapsed ? 'lg:hidden' : ''}`}>
                {companyLabel}
              </span>
            </Link>
            <button
              className="lg:hidden"
              onClick={() => setMobileOpen(false)}
              aria-label="Fechar menu"
            >
              ×
            </button>
          </div>
          <nav
            aria-label="Navegação administrativa"
            className="sidebar-scroll min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-5"
          >
            {navigation
              .map((group) => ({
                ...group,
                // Menu por permissão: esconde o item que o usuário não pode
                // ler e o grupo inteiro se ficar sem itens.
                items: group.items.filter((item) =>
                  allowed(user.role, user.permissions, item[3] as string | null)
                ),
              }))
              .filter((group) => group.items.length > 0)
              .map((group) => (
              <section key={group.title}>
                <button
                  onClick={() =>
                    setClosedGroups((previous) =>
                      previous.includes(group.title)
                        ? previous.filter((title) => title !== group.title)
                        : [...previous, group.title]
                    )
                  }
                  aria-expanded={!closedGroups.includes(group.title)}
                  className={`mb-2 flex w-full justify-between px-2 text-xs font-semibold uppercase tracking-wider text-slate-500 ${collapsed ? 'lg:hidden' : ''}`}
                >
                  {group.title}
                  <span>{closedGroups.includes(group.title) ? '+' : '−'}</span>
                </button>
                {!closedGroups.includes(group.title) &&
                  group.items.map(([href, label, initials]) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMobileOpen(false)}
                      title={label}
                      aria-current={pathname === href ? 'page' : undefined}
                      className={`mb-1 flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm transition ${pathname === href ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}
                    >
                      <span
                        aria-hidden="true"
                        className="w-7 shrink-0 text-center text-xs font-semibold"
                      >
                        {initials}
                      </span>
                      <span className={collapsed ? 'lg:hidden' : ''}>
                        {label}
                      </span>
                      <span className="sr-only">{collapsed ? label : ''}</span>
                    </Link>
                  ))}
              </section>
            ))}
          </nav>
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={
              collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'
            }
            aria-expanded={!collapsed}
            className="hidden border-t border-slate-800 p-4 text-sm hover:bg-slate-800 lg:block"
          >
            {collapsed ? '→' : '← Recolher menu'}
          </button>
        </aside>
        <div
          className={`transition-all ${collapsed ? 'lg:pl-20' : 'lg:pl-64'}`}
        >
          <header className="flex min-h-20 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-8">
            <div className="flex items-center gap-3">
              <button
                aria-label="Abrir menu lateral"
                aria-controls="admin-navigation"
                aria-expanded={mobileOpen}
                onClick={() => setMobileOpen(true)}
                className="rounded-lg border px-3 py-2 lg:hidden"
              >
                ☰
              </button>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  {tenant?.displayName || tenant?.name || 'Área administrativa'}
                </p>
                <p className="font-semibold text-slate-900">{currentTitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600">{user.name}</span>
              <button onClick={logout} className="admin-secondary">
                Sair
              </button>
            </div>
          </header>
          {user.role === 'master' && (
            <div className="flex flex-wrap items-center gap-3 border-b border-blue-100 bg-blue-50 px-4 py-3 text-sm sm:px-8">
              <label htmlFor="workspace">Visualizar empresa:</label>
              <select
                id="workspace"
                className="admin-input max-w-xs"
                value={selectedTenant}
                onChange={(event) => setSelectedTenant(event.target.value)}
              >
                <option value="">Selecione uma empresa</option>
                {companies.map((company) => (
                  <option key={company._id} value={company._id}>
                    {company.name}
                  </option>
                ))}
              </select>
              <span className="text-blue-800">
                {companyError ||
                  'Prévia da área do cliente. O painel MASTER será construído depois.'}
              </span>
            </div>
          )}
          <div key={workspace}>
            {/* Guarda de rota: quem burlar o menu pela URL vê o bloqueio —
                e o backend continua rejeitando qualquer chamada sem
                permissão. */}
            {allowed(
              user.role,
              user.permissions,
              routePermissions[pathname] || null
            ) ? (
              children
            ) : (
              <main className="mx-auto max-w-3xl p-4 sm:p-8">
                <section className="admin-panel py-12 text-center">
                  <h2 className="text-lg font-semibold">Acesso restrito</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Você não tem permissão para visualizar esta área. Peça a
                    liberação a um administrador.
                  </p>
                </section>
              </main>
            )}
          </div>
        </div>
      </div>
    </WorkspaceContext.Provider>
  );
}
