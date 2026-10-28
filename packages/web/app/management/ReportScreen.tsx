'use client';

import { startTransition, useCallback, useEffect, useState } from 'react';
import { useWorkspaceApi } from '../AdminShell';
import { display, type Row } from './config';
import { DataTable, errorMessage, Notice, PageHeading } from './ui';

const reports: Record<string, { label: string; columns: [string, string][] }> =
  {
    sales: {
      label: 'Vendas por período',
      columns: [
        ['period', 'Período (UTC)'],
        ['status', 'Situação'],
        ['count', 'Vendas'],
        ['total', 'Faturamento'],
      ],
    },
    products: {
      label: 'Produtos mais vendidos',
      columns: [
        ['name', 'Produto'],
        ['sku', 'SKU'],
        ['quantity', 'Quantidade'],
        ['revenue', 'Receita'],
      ],
    },
    inventory: {
      label: 'Posição de estoque',
      columns: [
        ['name', 'Produto'],
        ['sku', 'SKU'],
        ['quantityInStock', 'Quantidade'],
        ['minStock', 'Mínimo'],
        ['price', 'Preço'],
        ['costPrice', 'Custo'],
      ],
    },
    'stock-movements': {
      label: 'Movimentações de estoque',
      columns: [
        ['createdAt', 'Última atualização'],
        ['productId', 'Produto'],
        ['type', 'Tipo'],
        ['quantity', 'Quantidade'],
        ['previousQuantity', 'Anterior'],
        ['newQuantity', 'Novo saldo'],
        ['reason', 'Motivo'],
        ['reference', 'Referência'],
        ['createdBy', 'Responsável'],
      ],
    },
    'cash-flow': {
      label: 'Fluxo de caixa',
      columns: [
        ['period', 'Período (UTC)'],
        ['sales', 'Vendas (todas)'],
        ['cashSales', 'Vendas em dinheiro'],
        ['billsReceive', 'Recebimentos'],
        ['billsPay', 'Pagamentos'],
        ['suprimentos', 'Reforços'],
        ['sangrias', 'Sangrias'],
        ['estornos', 'Estornos'],
        ['inflow', 'Entradas'],
        ['outflow', 'Saídas'],
        ['balance', 'Saldo'],
      ],
    },
  };
const summaryLabels: Record<string, string> = {
  count: 'Vendas',
  total: 'Faturamento',
  totalProducts: 'Produtos',
  lowStockCount: 'Estoque baixo',
  totalCostValue: 'Valor de custo',
  totalSaleValue: 'Valor de venda',
  sales: 'Vendas',
  cashSales: 'Vendas em dinheiro',
  billsReceive: 'Contas recebidas',
  billsPay: 'Contas pagas',
  suprimentos: 'Reforços',
  sangrias: 'Sangrias',
  estornos: 'Estornos',
  inflow: 'Entradas',
  outflow: 'Saídas',
  balance: 'Saldo',
};

export default function ReportScreen() {
  const { client, tenantId } = useWorkspaceApi();
  const [kind, setKind] = useState('sales');
  const [start, setStart] = useState(() =>
    new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  );
  const [end, setEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [groupBy, setGroupBy] = useState('day');
  const [lowStock, setLowStock] = useState(false);
  // Filtro de tipo exibido apenas no relatório de movimentações de estoque.
  const [movementType, setMovementType] = useState('');
  const [query, setQuery] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Row>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError('');
    try {
      const response = await client.get(`/reports/${kind}`, {
        params: {
          groupBy: 'day',
          ...query,
          page,
          limit: kind === 'products' ? 100 : 20,
        },
      });
      const result = response.data.data;
      setRows(kind === 'inventory' ? result.products.data : result.data || []);
      setSummary(result.summary || {});
      setPages(
        kind === 'inventory'
          ? result.products.pagination.totalPages
          : result.pagination?.totalPages || 0
      );
    } catch (cause) {
      setError(errorMessage(cause));
      setRows([]);
      setSummary({});
    } finally {
      setLoading(false);
    }
  }, [client, tenantId, kind, query, page]);
  useEffect(() => {
    startTransition(() => {
      void load();
    });
  }, [load]);

  return (
    <main className="mx-auto max-w-screen-2xl space-y-5 p-4 sm:p-8">
      <PageHeading
        title="Relatórios"
        description="Analise vendas, produtos, estoque e financeiro com os dados da empresa."
      />
      <Notice error={error} />
      {!tenantId ? (
        <Notice message="Selecione uma empresa no cabeçalho." />
      ) : (
        <>
          <form
            className="admin-panel flex flex-wrap items-end gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (start && end && start > end) {
                setError('A data inicial não pode ser posterior à final.');
                return;
              }
              setPage(1);
              setQuery({
                ...(start ? { startDate: `${start}T00:00:00.000Z` } : {}),
                ...(end ? { endDate: `${end}T23:59:59.999Z` } : {}),
                groupBy,
                lowStock: String(lowStock),
                ...(movementType ? { type: movementType } : {}),
              });
            }}
          >
            <label className="admin-label">
              Relatório
                <select
                  className="admin-input mt-1"
                  value={kind}
                  onChange={(event) => {
                    setKind(event.target.value);
                    setPage(1);
                  }}
                >
                  {Object.entries(reports).map(([value, report]) => (
                    <option key={value} value={value}>
                      {report.label}
                    </option>
                  ))}
                </select>
              </label>
            {kind !== 'inventory' && (
              <>
                <label className="admin-label">
                  Data inicial (UTC)
                  <input
                    className="admin-input mt-1"
                    type="date"
                    value={start}
                    onChange={(event) => setStart(event.target.value)}
                  />
                </label>
                <label className="admin-label">
                  Data final (UTC)
                  <input
                    className="admin-input mt-1"
                    type="date"
                    value={end}
                    onChange={(event) => setEnd(event.target.value)}
                  />
                </label>
              </>
            )}
            {['sales', 'cash-flow'].includes(kind) && (
              <label className="admin-label">
                Agrupamento
                <select
                  className="admin-input mt-1"
                  value={groupBy}
                  onChange={(event) => setGroupBy(event.target.value)}
                >
                  {[
                    ['day', 'Dia'],
                    ['month', 'Mês'],
                    ['year', 'Ano'],
                    ['none', 'Consolidado'],
                  ].map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {kind === 'stock-movements' && (
              <label className="admin-label">
                Tipo
                <select
                  className="admin-input mt-1"
                  value={movementType}
                  onChange={(event) => setMovementType(event.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="in">Entrada</option>
                  <option value="out">Saída</option>
                  <option value="adjust">Acerto de estoque</option>
                </select>
              </label>
            )}
            {kind === 'inventory' && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={lowStock}
                  onChange={(event) => setLowStock(event.target.checked)}
                />
                Somente estoque baixo
              </label>
            )}
            <button className="admin-primary" disabled={loading}>
              {loading ? 'Carregando...' : 'Gerar relatório'}
            </button>
          </form>
          {/* No fluxo de caixa os cards de resumo são redundantes: a
              tabela já traz os mesmos valores linha a linha. */}
          {kind !== 'cash-flow' && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Object.entries(summary)
                .filter(([key]) => key !== '_id')
                .map(([key, value]) => (
                  <div key={key} className="admin-panel">
                    <p className="text-sm text-slate-500">
                      {summaryLabels[key] || key}
                    </p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      {display(value, key)}
                    </p>
                  </div>
                ))}
            </div>
          )}
          {loading ? (
            <p role="status">Carregando relatório...</p>
          ) : (
            <DataTable rows={rows} columns={reports[kind].columns} />
          )}
          {pages > 0 && (
            <div className="flex items-center justify-end gap-3">
              <button
                className="admin-secondary"
                disabled={loading || page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Anterior
              </button>
              <span className="text-sm">
                Página {page} de {pages}
              </span>
              <button
                className="admin-secondary"
                disabled={loading || page >= pages}
                onClick={() => setPage(page + 1)}
              >
                Próxima
              </button>
            </div>
          )}
          {kind === 'products' && (
            <p className="text-xs text-slate-500">
              Exibindo até 100 produtos mais vendidos no período.
            </p>
          )}
        </>
      )}
    </main>
  );
}
