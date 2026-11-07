'use client';

import { useCallback, useEffect, useState, startTransition } from 'react';
import { useWorkspaceApi } from '../AdminShell';
import { useAuth } from '../context/AuthContext';
import { DataTable, errorMessage, Notice, PageHeading } from './ui';
import type { Row } from './config';

// Card de métrica do painel — mesmo padrão visual dos resumos de relatório.
function MetricCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-bold text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

const currency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Painel da plataforma: visão consolidada de todas as empresas — exclusiva
// do master (a API reforça com isMaster; a rota some para os demais).
// Métricas agregadas devolvidas pela API da plataforma.
interface PlatformTotals {
  tenants: number;
  activeTenants: number;
  users: number;
  products: number;
  orders: number;
  revenue: number;
}

export default function PlatformScreen() {
  const { client } = useWorkspaceApi();
  const { user } = useAuth();
  const [totals, setTotals] = useState<PlatformTotals | null>(null);
  const [companies, setCompanies] = useState<Row[]>([]);
  // O AdminShell só renderiza com sessão pronta: loading nasce ligado só
  // quando quem abriu é master (o estado inicial evita setState no effect).
  const [loading, setLoading] = useState(user?.role === 'master');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await client.get('/platform/metrics');
      // setState só depois do await — chamá-lo antes faria o effect
      // disparar atualização síncrona (regra set-state-in-effect).
      setError('');
      setTotals(response.data.data.totals);
      setCompanies(response.data.data.companies);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    if (user?.role === 'master') {
      // startTransition adia as atualizações de estado do load para fora do
      // effect síncrono — mesmo padrão das outras telas.
      startTransition(() => {
        void load();
      });
    }
  }, [user, load]);

  return (
    <main className="mx-auto max-w-screen-2xl space-y-5 p-4 sm:p-8">
      <PageHeading
        title="Plataforma"
        description="Visão consolidada de todas as empresas cadastradas — uso, vendas e faturamento por tenant."
      />
      <Notice error={error} />
      {user?.role !== 'master' ? (
        <Notice message="Esta área é exclusiva do usuário master." />
      ) : loading ? (
        <div role="status" className="admin-panel py-12 text-center">
          Carregando métricas...
        </div>
      ) : (
        <>
          {totals && (
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              <MetricCard
                label="Empresas"
                value={totals.tenants}
                hint={`${totals.activeTenants} ativa(s)`}
              />
              <MetricCard label="Usuários" value={totals.users} />
              <MetricCard label="Produtos" value={totals.products} />
              <MetricCard label="Vendas" value={totals.orders} />
              <MetricCard label="Faturamento" value={currency(totals.revenue)} />
              <MetricCard
                label="Ticket médio"
                value={totals.orders ? currency(totals.revenue / totals.orders) : '—'}
              />
            </section>
          )}
          <section className="admin-panel">
            <h2 className="text-lg font-semibold">Empresas</h2>
            <p className="mt-1 text-sm text-slate-500">
              Uso e faturamento consolidado por empresa. Use o seletor do
              cabeçalho para abrir a área administrativa de uma delas.
            </p>
            <div className="mt-4">
              <DataTable
                rows={companies.map((company) => ({
                  ...company,
                  status: company.isActive !== false ? 'Ativa' : 'Inativa',
                }))}
                columns={[
                  ['name', 'Empresa'],
                  ['status', 'Situação'],
                  ['users', 'Usuários', 'right'],
                  ['products', 'Produtos', 'right'],
                  ['orders', 'Vendas', 'right'],
                  ['revenue', 'Faturamento', 'right'],
                  ['lastOrderAt@date', 'Última venda'],
                ]}
              />
            </div>
          </section>
        </>
      )}
    </main>
  );
}
