'use client';

import { startTransition, useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useWorkspaceApi } from '../AdminShell';
import { display, type Row } from './config';
import { DataTable, errorMessage, Modal, Notice, PageHeading } from './ui';

// Terceiro item opcional da coluna define o alinhamento ('right' p/ valores).
// Terceiro item opcional da coluna define o alinhamento ('right' p/ valores).
const reports: Record<
  string,
  { label: string; columns: [string, string, ('left' | 'right')?][] }
> =
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
        ['quantity', 'Quantidade', 'right'],
        ['costPrice', 'Custo', 'right'],
        // Preço médio de venda = receita ÷ quantidade: ajuda a ver se o
        // produto saiu pelo preço cheio ou com desconto.
        ['avgPrice', 'Preço médio de venda', 'right'],
        ['revenue', 'Receita', 'right'],
      ],
    },
    inventory: {
      label: 'Posição de estoque',
      columns: [
        ['name', 'Produto'],
        ['sku', 'SKU'],
        ['status', 'Situação'],
        ['quantityInStock', 'Quantidade', 'right'],
        ['minStock', 'Mínimo', 'right'],
        ['price', 'Preço', 'right'],
        ['costPrice', 'Custo', 'right'],
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
  // Situação do estoque: '' (todos), 'low' (estoque baixo) ou 'inStock'
  // (somente produtos com saldo acima de zero).
  const [stockStatus, setStockStatus] = useState('');
  // Filtro de tipo exibido apenas no relatório de movimentações de estoque.
  const [movementType, setMovementType] = useState('');
  const [query, setQuery] = useState<Record<string, string>>({});
  // Relatório aplicado na última geração — o select só prepara a tela,
  // a busca acontece quando o usuário clica em "Gerar relatório".
  const [appliedKind, setAppliedKind] = useState('sales');
  // Listagem sob demanda, mesmo padrão das demais telas.
  const [searched, setSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Row>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Filtros específicos do relatório de posição de estoque.
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  // Categorias carregadas só quando o relatório de estoque é escolhido.
  const [categories, setCategories] = useState<Row[]>([]);
  // Impressão da posição de estoque: o modal pergunta se saem os
  // custos/preços ou uma coluna de observação para a conferência.
  const [printModal, setPrintModal] = useState(false);
  const [printRows, setPrintRows] = useState<Row[] | null>(null);
  const [printCosts, setPrintCosts] = useState(false);
  // Ordenação da impressão: alfabética pelo nome ou agrupada por
  // categoria (categoria e produto em ordem alfabética).
  const [printOrder, setPrintOrder] = useState<'alpha' | 'category'>('alpha');

  const load = useCallback(async () => {
    if (!tenantId || !searched) {
      setRows([]);
      setSummary({});
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await client.get(`/reports/${appliedKind}`, {
        params: {
          groupBy: 'day',
          ...query,
          page,
          limit: appliedKind === 'products' ? 100 : 20,
        },
      });
      const result = response.data.data;
      const data =
        (appliedKind === 'inventory' ? result.products.data : result.data || []) as Row[];
      // Zeros numéricos viram "—" na tabela: mais fácil de ler as colunas
      // de valores quando a maioria das linhas é zero.
      setRows(
        data.map((row) => {
          // Posição de estoque ganha coluna de situação (badge) calculada
          // no front: quantidade igual ou abaixo do mínimo = estoque baixo.
          const enriched =
            appliedKind === 'inventory'
              ? {
                  ...row,
                  status:
                    Number(row.quantityInStock) <= Number(row.minStock)
                      ? 'Estoque baixo'
                      : 'Normal',
                }
              : appliedKind === 'products'
                ? {
                    ...row,
                    // Preço médio de venda do produto no período.
                    avgPrice: Number(row.quantity)
                      ? Number(row.revenue) / Number(row.quantity)
                      : 0,
                  }
                : row;
          return Object.fromEntries(
            Object.entries(enriched).map(([key, value]) => [
              key,
              typeof value === 'number' && value === 0 ? null : value,
            ])
          );
        })
      );
      setSummary(result.summary || {});
      setPages(
        appliedKind === 'inventory'
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
  }, [client, tenantId, appliedKind, query, page, searched]);
  useEffect(() => {
    startTransition(() => {
      void load();
    });
  }, [load]);

  // Só busca categorias quando o relatório de posição de estoque é
  // selecionado — são o filtro de categoria do formulário.
  useEffect(() => {
    if (kind !== 'inventory' || categories.length || !tenantId) return;
    let active = true;
    client
      .get('/categories', { params: { limit: 100 } })
      .then((response) => {
        if (active) setCategories(response.data.data.data as Row[]);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [kind, categories.length, client, tenantId]);

  // Impressão: busca a posição completa com os mesmos filtros aplicados
  // e abre a janela nativa — só a .print-area fica visível no papel
  // (ver globals.css). A API limita a 100 por página, então percorre
  // todas as páginas para o relatório sair com o estoque inteiro.
  const handlePrint = async (withCosts: boolean) => {
    setPrintCosts(withCosts);
    setPrintModal(false);
    try {
      const list: Row[] = [];
      let printPage = 1;
      let printTotalPages = 1;
      do {
        const response = await client.get(`/reports/${appliedKind}`, {
          params: { ...query, page: printPage, limit: 100 },
        });
        const products = response.data.data.products;
        list.push(...((products?.data || []) as Row[]));
        printTotalPages = products?.pagination?.totalPages || 0;
        printPage++;
      } while (printPage <= printTotalPages);
      // Ordenação escolhida no modal — por categoria agrupa em ordem
      // alfabética de categoria e, dentro dela, de produto.
      const collator = new Intl.Collator('pt-BR');
      const categoryName = (row: Row) =>
        String((row.categoryId as Row)?.name || '—');
      list.sort(
        printOrder === 'category'
          ? (a, b) =>
              collator.compare(categoryName(a), categoryName(b)) ||
              collator.compare(String(a.name), String(b.name))
          : (a, b) => collator.compare(String(a.name), String(b.name))
      );
      setPrintRows(list);
      // Um tick para o estado aplicar antes da janela de impressão abrir.
      setTimeout(() => window.print(), 60);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  };

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
              setSearched(true);
              setAppliedKind(kind);
              setQuery({
                ...(start ? { startDate: `${start}T00:00:00.000Z` } : {}),
                ...(end ? { endDate: `${end}T23:59:59.999Z` } : {}),
                groupBy,
                lowStock: String(stockStatus === 'low'),
                inStock: String(stockStatus === 'inStock'),
                ...(movementType ? { type: movementType } : {}),
                ...(search ? { search } : {}),
                ...(categoryId ? { categoryId } : {}),
              });
            }}
          >
            <label className="admin-label">
              Relatório
                <select
                  className="admin-input mt-1"
                  value={kind}
                  onChange={(event) => {
                    // Trocar de relatório limpa o resultado anterior e
                    // volta a exigir o clique em "Gerar relatório".
                    setKind(event.target.value);
                    setSearched(false);
                    setRows([]);
                    setSummary({});
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
              <>
                <label className="admin-label">
                  Pesquisar
                  <input
                    className="admin-input mt-1"
                    value={search}
                    placeholder="Nome, SKU ou categoria"
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </label>
                <label className="admin-label">
                  Categoria
                  <select
                    className="admin-input mt-1"
                    value={categoryId}
                    onChange={(event) => setCategoryId(event.target.value)}
                  >
                    <option value="">Todas</option>
                    {categories.map((category) => (
                      <option key={String(category._id)} value={String(category._id)}>
                        {String(category.name)}
                      </option>
                    ))}
                  </select>
                </label>
                {/* Mesmo padrão visual do select de Categoria. */}
                <label className="admin-label">
                  Situação
                  <select
                    className="admin-input mt-1"
                    value={stockStatus}
                    onChange={(event) => setStockStatus(event.target.value)}
                  >
                    <option value="">Todos</option>
                    <option value="low">Estoque baixo</option>
                    <option value="inStock">Somente com saldo</option>
                  </select>
                </label>
              </>
            )}
            {/* mb-1.5 iguala a margem inferior das admin-label: com
                items-end o botão alinhava com a margem da label e ficava
                alguns pixels abaixo dos inputs. */}
            <button className="admin-primary mb-1.5" disabled={loading}>
              {loading ? 'Carregando...' : 'Gerar relatório'}
            </button>
            {/* Impressão da posição de estoque — habilita só depois de
                gerar o relatório com dados na tela. */}
            {kind === 'inventory' && (
              <button
                type="button"
                className="admin-secondary mb-1.5"
                disabled={
                  loading ||
                  appliedKind !== 'inventory' ||
                  !searched ||
                  !rows.length
                }
                onClick={() => setPrintModal(true)}
              >
                Imprimir relatório
              </button>
            )}
          </form>
          {/* No fluxo de caixa os cards de resumo são redundantes: a
              tabela já traz os mesmos valores linha a linha. */}
          {searched && appliedKind !== 'cash-flow' && (
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
          {!searched ? (
            <div className="admin-panel py-12 text-center text-sm text-slate-500">
              Configure os filtros e clique em Gerar relatório para visualizar
              os dados.
            </div>
          ) : loading ? (
            <p role="status">Carregando relatório...</p>
          ) : (
            <DataTable rows={rows} columns={reports[appliedKind].columns} />
          )}
          {searched && pages > 0 && (
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
          {searched && appliedKind === 'products' && (
            <p className="text-xs text-slate-500">
              Exibindo até 100 produtos mais vendidos no período.
            </p>
          )}
          {printModal && (
            <Modal
              title="Imprimir posição de estoque"
              onClose={() => setPrintModal(false)}
            >
              <p className="mb-4 text-sm text-slate-600">
                Deseja incluir os preços e custos dos produtos na impressão?
                Sem eles, a tabela sai com uma coluna de observação para
                anotações durante a conferência do estoque.
              </p>
              <fieldset className="mb-5">
                <legend className="mb-2 text-sm font-medium text-slate-700">
                  Ordenação da impressão
                </legend>
                <div className="space-y-1.5">
                  {(
                    [
                      ['alpha', 'Ordem alfabética (nome do produto)'],
                      ['category', 'Por categoria (ordem alfabética)'],
                    ] as const
                  ).map(([value, label]) => (
                    <label
                      key={value}
                      className="flex items-center gap-2 text-sm text-slate-700"
                    >
                      <input
                        type="radio"
                        name="printOrder"
                        checked={printOrder === value}
                        onChange={() => setPrintOrder(value)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="admin-secondary"
                  onClick={() => void handlePrint(false)}
                >
                  Imprimir sem custos
                </button>
                <button
                  type="button"
                  className="admin-primary"
                  onClick={() => void handlePrint(true)}
                >
                  Imprimir com custos
                </button>
              </div>
            </Modal>
          )}
        </>
      )}
      {/* Área só de impressão: a posição vai sem paginação e, quando
          optado, sem custos/preços — no lugar fica a coluna de
          observação para a conferência manual do estoque. */}
      {printRows &&
        createPortal(
          <div className="print-area print-doc">
            <div>
            <h1 className="text-lg font-bold">Posição de estoque</h1>
            <p className="mb-4 text-xs text-slate-600">
              Gerado em {new Date().toLocaleString('pt-BR')} ·{' '}
              {printRows.length} produto(s) ·{' '}
              {printOrder === 'category'
                ? 'ordenado por categoria'
                : 'ordem alfabética'}{' '}
              · {printCosts ? 'com preços e custos' : 'para conferência'}
            </p>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {[
                    'Produto',
                    ...(printOrder === 'category' ? ['Categoria'] : []),
                    'Qtd.',
                    ...(printCosts ? ['Preço', 'Custo'] : ['Observação']),
                  ].map((head) => (
                    <th
                      key={head}
                      className="border-b border-black pb-1 text-left text-xs uppercase"
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {printRows.map((row, index) => (
                  <tr key={String(row._id || index)}>
                    <td className="border-b border-slate-300 py-1.5 pr-2">
                      {display(row.name, 'name')}
                    </td>
                    {printOrder === 'category' && (
                      <td className="border-b border-slate-300 py-1.5 pr-2">
                        {String((row.categoryId as Row)?.name || '—')}
                      </td>
                    )}
                    <td className="border-b border-slate-300 py-1.5 pr-2">
                      {display(row.quantityInStock, 'quantityInStock')}
                    </td>
                    {printCosts ? (
                      <>
                        <td className="border-b border-slate-300 py-1.5">
                          {display(row.price, 'price')}
                        </td>
                        <td className="border-b border-slate-300 py-1.5">
                          {display(row.costPrice, 'costPrice')}
                        </td>
                      </>
                    ) : (
                      <td className="border-b border-slate-300 py-1.5" />
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>,
          document.body
        )}
    </main>
  );
}
