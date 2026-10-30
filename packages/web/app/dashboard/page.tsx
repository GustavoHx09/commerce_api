'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { useWorkspaceApi } from '../AdminShell';
import Icon from '../Icon';
import { errorMessage, Notice } from '../management/ui';

interface SalesSummary {
  count: number;
  total: number;
}
interface DashboardData {
  totalUsers: number;
  totalProducts: number;
  totalCustomers: number;
  salesToday: SalesSummary;
  salesWeek: SalesSummary;
  salesMonth: SalesSummary;
  canceledMonth: SalesSummary;
  lowStockProducts: {
    _id: string;
    name: string;
    sku: string;
    quantityInStock: number;
    minStock: number;
  }[];
  openCashiersCount: number;
  totalInCashier: number;
}

function currency(value: number) {
  return Number(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export default function DashboardPage() {
  const { user, tenant, refreshSession } = useAuth();
  const { client, tenantId } = useWorkspaceApi();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (!user || !tenantId) return;
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await client.get('/dashboard', {
          signal: controller.signal,
        });
        setDashboard(response.data.data);
      } catch (cause) {
        if (!controller.signal.aborted) {
          setDashboard(null);
          setError(errorMessage(cause));
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [user, client, tenantId, refresh]);

  if (!user) return null;
  const ready = !loading && Boolean(dashboard);
  const primary = /^#[0-9a-f]{6}$/i.test(tenant?.colors?.primary || '')
    ? tenant!.colors!.primary!
    : '#2563eb';
  const metrics = [
    {
      label: 'Vendas de hoje',
      value: dashboard?.salesToday.total,
      sub: `${dashboard?.salesToday.count ?? 0} vendas realizadas`,
      icon: 'bag' as const,
      tone: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Vendas da semana',
      value: dashboard?.salesWeek.total,
      sub: `${dashboard?.salesWeek.count ?? 0} vendas no período`,
      icon: 'chart' as const,
      tone: 'bg-indigo-50 text-indigo-600',
    },
    {
      label: 'Vendas do mês',
      value: dashboard?.salesMonth.total,
      sub: `${dashboard?.salesMonth.count ?? 0} vendas no período`,
      icon: 'calendar' as const,
      tone: 'bg-violet-50 text-violet-600',
    },
    {
      label: 'Vendas canceladas',
      value: dashboard?.canceledMonth.total,
      sub: `${dashboard?.canceledMonth.count ?? 0} vendas estornadas no mês`,
      icon: 'alert' as const,
      tone: 'bg-red-50 text-red-600',
    },
    {
      label: 'Saldo dos caixas',
      value: dashboard?.totalInCashier,
      sub: `${dashboard?.openCashiersCount ?? 0} caixas abertos`,
      icon: 'wallet' as const,
      tone: 'bg-emerald-50 text-emerald-600',
    },
  ];
  const shortcuts = [
    {
      href: '/management/pos',
      title: 'Nova venda',
      text: 'Abra o PDV e comece a vender',
      icon: 'bag' as const,
      tone: 'bg-blue-50 text-blue-600',
    },
    {
      href: '/management/products',
      title: 'Cadastrar produto',
      text: 'Mantenha seu catálogo atualizado',
      icon: 'box' as const,
      tone: 'bg-violet-50 text-violet-600',
    },
    {
      href: '/management/customers',
      title: 'Novo cliente',
      text: 'Amplie seus relacionamentos',
      icon: 'users' as const,
      tone: 'bg-emerald-50 text-emerald-600',
    },
    {
      href: '/management/reports',
      title: 'Ver relatórios',
      text: 'Transforme dados em decisões',
      icon: 'chart' as const,
      tone: 'bg-amber-50 text-amber-600',
    },
  ];

  return (
    <main className="mx-auto max-w-screen-2xl space-y-7 p-4 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Visão geral da empresa
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Seu negócio em movimento
          </h1>
        </div>
        <button
          className="admin-secondary gap-2"
          disabled={loading && Boolean(tenantId)}
          onClick={() => {
            void refreshSession();
            setRefresh((value) => value + 1);
          }}
        >
          <Icon
            name="refresh"
            className={`h-4 w-4 ${loading && tenantId ? 'animate-spin' : ''}`}
          />
          Atualizar painel
        </button>
      </div>
      <section className="relative isolate overflow-hidden rounded-2xl bg-slate-950 p-6 text-white sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-40 h-96 w-96 rounded-full border-[50px] border-white/[0.04]"
        />
        <div
          aria-hidden="true"
          className="absolute bottom-0 right-0 -z-10 h-full w-2/3 opacity-40"
          style={{
            background: `radial-gradient(ellipse at bottom right, ${primary}, transparent 70%)`,
          }}
        />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div>
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-blue-100">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
              Painel de gestão
            </span>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Olá, {user.name.split(' ')[0]}. Boas-vindas!
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-6 text-slate-400">
              Acompanhe os números, cuide do estoque e tenha mais clareza para o
              próximo passo.
            </p>
          </div>
          <div className="flex flex-col items-start gap-4">
            <Link
              href="/management/pos"
              className="inline-flex items-center gap-3 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-blue-50"
            >
              <Icon name="plus" className="h-4 w-4" />
              Iniciar uma venda
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
      {!tenantId ? (
        <section className="admin-panel flex items-start gap-4">
          <span className="rounded-xl bg-blue-50 p-3 text-blue-600">
            <Icon name="users" />
          </span>
          <div>
            <h2 className="font-semibold">Escolha uma empresa para começar</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Use o seletor no cabeçalho para visualizar os indicadores e operar
              na área administrativa de um cliente.
            </p>
          </div>
        </section>
      ) : (
        <>
          <Notice error={error} />
          <section
            aria-label="Indicadores da empresa"
            aria-busy={loading}
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            {metrics.map((metric) => (
              <article
                key={metric.label}
                className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
              >
                <div className="mb-5 flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-500">
                    {metric.label}
                  </p>
                  <span className={`rounded-xl p-2.5 ${metric.tone}`}>
                    <Icon name={metric.icon} />
                  </span>
                </div>
                {loading ? (
                  <div className="mb-3 h-8 w-36 animate-pulse rounded-md bg-slate-100" />
                ) : (
                  <p className="text-2xl font-bold tracking-tight text-slate-900">
                    {ready ? currency(metric.value ?? 0) : '—'}
                  </p>
                )}
                <p className="mt-2 text-xs text-slate-400">
                  {ready
                    ? metric.sub
                    : loading
                      ? 'Buscando indicadores...'
                      : 'Dados indisponíveis'}
                </p>
              </article>
            ))}
          </section>
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)]">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5 sm:px-6">
                <div className="flex items-center gap-3">
                  <span className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
                    <Icon name="alert" />
                  </span>
                  <div>
                    <h2 className="font-semibold text-slate-900">
                      Atenção ao estoque
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Produtos no limite ou abaixo do mínimo
                    </p>
                  </div>
                </div>
                <Link
                  href="/management/products?view=lowStock"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  Ver estoque
                  <Icon name="arrow" className="h-3.5 w-3.5" />
                </Link>
              </div>
              {loading ? (
                <div role="status" className="space-y-4 p-6">
                  {[0, 1, 2].map((index) => (
                    <div
                      key={index}
                      className="h-12 animate-pulse rounded-lg bg-slate-50"
                    />
                  ))}
                </div>
              ) : !ready ? (
                <p className="p-8 text-sm text-slate-500">
                  Não foi possível consultar o estoque. Tente atualizar o
                  painel.
                </p>
              ) : !dashboard?.lowStockProducts.length ? (
                <div className="px-6 py-12 text-center">
                  <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                    <Icon name="check" />
                  </span>
                  <p className="text-sm font-semibold text-slate-800">
                    Tudo em dia por aqui
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    Nenhum produto abaixo do estoque mínimo.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50/70 text-xs text-slate-400">
                      <tr>
                        <th className="px-6 py-3 font-medium">Produto</th>
                        <th className="px-4 py-3 text-right font-medium">
                          Atual / mínimo
                        </th>
                        <th className="px-6 py-3 text-right font-medium">
                          Situação
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dashboard?.lowStockProducts.map((product) => (
                        <tr key={product._id}>
                          <td className="px-6 py-4">
                            <p className="font-medium text-slate-800">
                              {product.name}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {product.sku}
                            </p>
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 text-right font-medium text-slate-700">
                            {product.quantityInStock}{' '}
                            <span className="font-normal text-slate-400">
                              / {product.minStock}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span
                              className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${product.quantityInStock <= 0 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}`}
                            >
                              {product.quantityInStock <= 0
                                ? 'Sem estoque'
                                : 'Repor estoque'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-slate-900">
                Sua empresa em números
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                A base que faz a operação acontecer
              </p>
              <div className="mt-5 divide-y divide-slate-100">
                {[
                  {
                    label: 'Produtos cadastrados',
                    value: dashboard?.totalProducts,
                    href: '/management/products',
                    icon: 'box' as const,
                  },
                  {
                    label: 'Clientes cadastrados',
                    value: dashboard?.totalCustomers,
                    href: '/management/customers',
                    icon: 'users' as const,
                  },
                  {
                    label: 'Usuários da empresa',
                    value: dashboard?.totalUsers,
                    href: '/management/users',
                    icon: 'shield' as const,
                  },
                ].map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="flex items-center gap-3 py-5 transition hover:text-blue-600"
                  >
                    <span className="rounded-lg bg-slate-50 p-2 text-slate-400">
                      <Icon name={item.icon} />
                    </span>
                    <span className="flex-1 text-sm text-slate-500">
                      {item.label}
                    </span>
                    <span className="text-xl font-semibold">
                      {ready ? (item.value ?? 0) : '—'}
                    </span>
                  </Link>
                ))}
              </div>
              <Link
                href="/management/reports"
                className="mt-2 flex items-center justify-between rounded-xl bg-blue-50 p-4 text-sm font-medium text-blue-700"
              >
                Explore seus relatórios
                <Icon name="arrow" className="h-4 w-4" />
              </Link>
            </section>
          </div>
        </>
      )}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <h2 className="font-semibold text-slate-900">
            O que vamos fazer agora?
          </h2>
          <span className="h-px flex-1 bg-slate-200" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {shortcuts.map((shortcut) => (
            <Link
              key={shortcut.href}
              href={shortcut.href}
              className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md motion-reduce:transform-none"
            >
              <span className={`rounded-xl p-3 ${shortcut.tone}`}>
                <Icon name={shortcut.icon} />
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800">
                  {shortcut.title}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  {shortcut.text}
                </p>
              </div>
              <Icon
                name="arrow"
                className="h-4 w-4 text-slate-300 transition group-hover:text-blue-600"
              />
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
