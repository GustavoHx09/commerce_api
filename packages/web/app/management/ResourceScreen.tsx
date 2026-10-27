'use client';

import { startTransition, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useWorkspaceApi } from '../AdminShell';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '@/lib/permissions';
import { display, getValue, type Field, type Row, type Screen } from './config';
import {
  DataTable,
  errorMessage,
  loadOptions,
  Modal,
  Notice,
  PageHeading,
  RecordForm,
} from './ui';

const detailLabels: Record<string, string> = {
  _id: 'Identificador',
  name: 'Nome',
  sku: 'SKU',
  description: 'Descrição',
  document: 'Documento',
  documentType: 'Tipo de documento',
  cpf: 'CPF',
  email: 'Email',
  phone: 'Telefone',
  address: 'Endereço',
  street: 'Rua',
  number: 'Número',
  complement: 'Complemento',
  neighborhood: 'Bairro',
  city: 'Cidade',
  state: 'Estado',
  zipCode: 'CEP',
  isActive: 'Ativo',
  unit: 'Unidade',
  price: 'Preço',
  costPrice: 'Custo',
  minStock: 'Estoque mínimo',
  quantityInStock: 'Estoque atual',
  categoryId: 'Categoria',
  role: 'Perfil',
  items: 'Itens',
  productId: 'Produto',
  quantity: 'Quantidade',
  unitPrice: 'Preço unitário',
  total: 'Total',
  discount: 'Desconto',
  amountPaid: 'Valor pago',
  change: 'Troco',
  status: 'Situação',
  createdAt: 'Criado em',
  updatedAt: 'Atualizado em',
  customerId: 'Cliente',
  cashierId: 'Caixa',
  paymentIds: 'Pagamentos',
  observations: 'Observações',
  cancelReason: 'Motivo do cancelamento',
  canceledAt: 'Cancelada em',
  initialAmount: 'Valor inicial',
  finalAmount: 'Valor final',
  openedAt: 'Abertura',
  closedAt: 'Fechamento',
  openedBy: 'Aberto por',
  closedBy: 'Fechado por',
  createdBy: 'Criado por',
  amount: 'Valor',
  dueDate: 'Vencimento',
  paidAt: 'Liquidada em',
  notes: 'Observações',
  type: 'Tipo',
  reason: 'Motivo',
  reference: 'Referência',
  previousQuantity: 'Quantidade anterior',
  newQuantity: 'Novo saldo',
  action: 'Operação',
  actorId: 'Responsável',
  entityId: 'Registro',
  entityType: 'Entidade',
  changes: 'Alterações',
  snapshot: 'Estado registrado',
  from: 'Anterior',
  to: 'Novo',
  method: 'Forma de pagamento',
  orderNumber: 'Nº da venda',
  fiscalNumber: 'Nº fiscal',
  installments: 'Parcelas',
  interestPercent: 'Juros (%)',
  interestAmount: 'Valor dos juros',
  cardSaleId: 'CV (venda no cartão)',
  authorizationCode: 'Autorização (AUTO)',
  balance: 'Saldo atual',
  cashierAmount: 'Valor do caixa',
  externalAmount: 'Valor externo',
  externalMethod: 'Forma externa',
  orderId: 'Venda vinculada',
  billId: 'Conta vinculada',
};
// Estilo padrão dos botões de ação da tabela: "pill" discreta com foco/hover
// visível, para distinguir ações (vermelho = destrutivo).
const actionButtonClass =
  'inline-flex items-center rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200';
const dangerButtonClass =
  'inline-flex items-center rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 shadow-sm transition hover:border-red-300 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200';

// Estilo compartilhado dos blocos de detalhes: caixas com borda e fundo
// claro, rótulo discreto e valor em destaque — usado em vendas, caixas
// e nos detalhes genéricos para manter o padrão visual.
const detailBoxClass = 'rounded-lg border border-slate-200 bg-slate-50 p-3';
const detailLabelClass = 'mb-1 text-xs font-semibold uppercase text-slate-500';
const detailValueClass = 'text-sm font-medium text-slate-900';

// Admin/master cancela qualquer venda; demais cargos só até 30 minutos
// após o lançamento (a mesma regra é reforçada no backend).
const canCancelOrder = (row: Row, role?: string) =>
  ['admin', 'master'].includes(role || '') ||
  Date.now() - new Date(String(row.createdAt)).getTime() <= 30 * 60 * 1000;

const hiddenFields = new Set([
  '_id',
  'password',
  'passwordChangedAt',
  'tenantId',
  '__v',
  'deletedAt',
  'permissionPresetId',
  'permissions',
  'revokedPermissions',
  'snapshot',
]);

// Detalhes de uma venda no estilo de um cupom: cabeçalho com os dados da
// venda, tabela de itens com "Total dos itens", observação do pedido embaixo
// e a parte financeira exibida pela tabela de pagamentos logo abaixo.
function OrderDetails({ row }: { row: Row }) {
  const items = (row.items as Row[]) || [];
  const money = (value: unknown) => display(value, 'total');
  const itemsTotal = items.reduce(
    (sum, item) => sum + (Number(item.total) || 0),
    0
  );

  const cell = 'px-3 py-2 text-sm';
  const headCell = 'px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500';

  return (
    <div className="space-y-5">
      <dl className="grid gap-3 sm:grid-cols-2">
        {[
          ['Venda', `#${row.orderNumber ?? '—'}`],
          ['Data', display(row.createdAt, 'createdAt')],
          ['Cliente', display(row.customerId, 'customerId')],
          ['Operador', display(row.createdBy, 'createdBy')],
          ...(Number(row.change) > 0 ? ([['Troco', money(row.change)]] as const) : []),
        ].map(([label, value]) => (
          <div key={String(label)} className={detailBoxClass}>
            <dt className={detailLabelClass}>{label}</dt>
            <dd className={detailValueClass}>{value}</dd>
          </div>
        ))}
      </dl>

      <div>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr className="divide-x divide-slate-200">
                <th className={headCell}>Qtde</th>
                <th className={headCell}>Produto</th>
                <th className={`${headCell} text-right`}>Unitário</th>
                <th className={`${headCell} text-right`}>Desc.</th>
                <th className={`${headCell} text-right`}>Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, index) => (
                <tr key={index} className="divide-x divide-slate-100">
                  <td className={cell}>{String(item.quantity)}</td>
                  <td className={cell}>{display(item.name, 'name')}</td>
                  <td className={`${cell} text-right`}>{money(item.unitPrice)}</td>
                  <td className={`${cell} text-right`}>
                    {Number(item.discount) > 0 ? money(item.discount) : '—'}
                  </td>
                  <td className={`${cell} text-right font-medium`}>{money(item.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {Number(row.discount) > 0 && (
                <tr className="border-t border-slate-200">
                  <td className={`${cell} text-slate-600`} colSpan={4}>
                    Desconto total da venda
                  </td>
                  <td className={`${cell} text-right font-medium text-slate-600`}>
                    - {money(row.discount)}
                  </td>
                </tr>
              )}
              <tr className="border-t border-slate-200 bg-slate-50">
                <td className={`${cell} font-semibold`} colSpan={4}>
                  Total dos itens
                </td>
                <td className={`${cell} text-right font-bold`}>
                  {money(itemsTotal - (Number(row.discount) || 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {Boolean(row.observations) && (
        <div className="rounded-lg border border-slate-100 p-3">
          <dt className="mb-1 text-xs font-semibold uppercase text-slate-500">
            Obs. do pedido
          </dt>
          <dd className="text-sm text-slate-800">{String(row.observations)}</dd>
        </div>
      )}

      {/* Pagamentos são exibidos pela tabela relacionada do modal
          (forma, parcelas e valor) — a parte "financeiro" do cupom. */}
    </div>
  );
}

// Detalhes de um caixa: abertura na coluna esquerda e fechamento na direita,
// totais recebidos por forma de pagamento e sem campos técnicos (IDs, ativo,
// criado em, saldo atual — já visível no resumo do dia — ou quem fechou).
function CashierDetails({ row }: { row: Row }) {
  const money = (value: unknown) => display(value ?? 0, 'initialAmount');
  const totals = (row.paymentTotals as Row) || {};
  const field = (label: string, value: string) => (
    <div className={detailBoxClass}>
      <dt className={detailLabelClass}>{label}</dt>
      <dd className={detailValueClass}>{value}</dd>
    </div>
  );
  return (
    <div className="space-y-5">
      <dl className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-3">
          {field('Abertura', display(row.openedAt, 'openedAt@date'))}
          {field('Aberto por', display(row.openedBy, 'openedBy'))}
          {field('Valor inicial', money(row.initialAmount))}
        </div>
        <div className="space-y-3">
          {field(
            'Fechamento',
            row.closedAt ? display(row.closedAt, 'closedAt@date') : 'Caixa aberto'
          )}
          {field('Situação', display(row.status, 'status'))}
          {Boolean(row.closedAt) &&
            field('Valor de fechamento', money(row.finalAmount))}
        </div>
      </dl>
      <div>
        <p className="mb-2 text-sm font-semibold text-slate-700">
          Recebido por forma de pagamento
        </p>
        <dl className="grid gap-3 sm:grid-cols-3">
          {field('Dinheiro', money(totals.cash))}
          {field('Pix', money(totals.pix))}
          {field('Cartões', money(totals.cards))}
        </dl>
      </div>
    </div>
  );
}

export function RecordDetails({ row }: { row: Row }) {
  return (
    <dl className="space-y-3">
      {Object.entries(row)
        .filter(([key, value]) => !hiddenFields.has(key) && value != null)
        .map(([key, value]) => (
          <div key={key} className={detailBoxClass}>
            <dt className={detailLabelClass}>
              {detailLabels[key] || key}
            </dt>
            <dd className={`break-words ${detailValueClass}`}>
              {Array.isArray(value) ? (
                value.length ? (
                  value.map((item, index) => (
                    <div
                      key={index}
                      className="mt-2 border-l-2 border-blue-100 pl-3"
                    >
                      {item && typeof item === 'object' ? (
                        <RecordDetails row={item as Row} />
                      ) : (
                        display(item)
                      )}
                    </div>
                  ))
                ) : (
                  'Nenhum'
                )
              ) : value && typeof value === 'object' ? (
                <RecordDetails row={value as Row} />
              ) : (
                display(value, key)
              )}
            </dd>
          </div>
        ))}
    </dl>
  );
}

export default function ResourceScreen({ screen }: { screen: Screen }) {
  const { client, tenantId } = useWorkspaceApi();
  const { user, refreshSession } = useAuth();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<Row[]>([]);
  // Resumo do caixa aberto exibido no topo da tela de caixas.
  const [openCashier, setOpenCashier] = useState<Row | null>(null);
  const [openCashierMovements, setOpenCashierMovements] = useState<Row[]>([]);
  const [showCashierHistory, setShowCashierHistory] = useState(false);
  const isCashiers = screen.endpoint === '/cashiers';
  const isProducts = screen.endpoint === '/products';
  // Produtos não carregam na abertura da tela: a listagem só acontece
  // sob demanda, quando o operador clica em Buscar — a menos que já
  // exista um filtro vindo da URL (ex.: alerta de estoque no dashboard).
  const initialFilters = Object.fromEntries(
    [
      'search',
      'productId',
      'type',
      'status',
      'minStockAlert',
      'isActive',
      'view',
    ]
      .map((key) => [key, searchParams.get(key) || ''] as const)
      .filter(([, value]) => value)
  );
  const [productsSearched, setProductsSearched] = useState(
    Object.keys(initialFilters).length > 0
  );
  // Resumo monetário reutiliza o formatador de exibição genérico.
  const currency = (value: unknown) => display(value, 'balance');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<Record<string, string>>(initialFilters);
  const [applied, setApplied] = useState<Record<string, string>>(initialFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editor, setEditor] = useState<Row | null>(null);
  const [details, setDetails] = useState<Row | null>(null);
  const [orderDetails, setOrderDetails] = useState<Row | null>(null);
  const [related, setRelated] = useState<Row[]>([]);
  const [relatedPage, setRelatedPage] = useState(1);
  const [relatedPages, setRelatedPages] = useState(0);
  const [action, setAction] = useState<{
    row: Row;
    name: string;
    title: string;
  } | null>(null);
  // Valor de fechamento do caixa anterior: a próxima abertura herda esse valor.
  const [lastClosing, setLastClosing] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    // Produtos começam com a lista vazia até a primeira busca sob demanda.
    if (isProducts && !productsSearched) {
      setRows([]);
      setTotal(0);
      setTotalPages(0);
      setLoading(false);
      return;
    }
    try {
      const response = await client.get(screen.endpoint, {
        params: {
          ...screen.params,
          ...applied,
          // Na tela de caixas a lista mostra apenas fechamentos — o caixa aberto
          // fica no resumo "Caixa do dia".
          ...(isCashiers ? { status: 'closed' } : {}),
          page,
          limit: 15,
        },
      });
      setRows(response.data.data.data);
      setTotalPages(response.data.data.pagination.totalPages);
      setTotal(response.data.data.pagination.total);

      // Resumo do caixa aberto: busca independente dos filtros da lista, assim
      // o "Caixa do dia" continua visível mesmo ao filtrar caixas fechados.
      // No modo compartilhado vale o caixa da empresa; no modo por operador,
      // apenas o caixa aberto pelo usuário logado.
      if (isCashiers) {
        const [openRes, companyRes] = await Promise.all([
          client.get('/cashiers', { params: { status: 'open', limit: 50 } }),
          client.get('/tenants/me'),
        ]);
        const shared = companyRes.data.data.tenant?.cashierMode === 'shared';
        const open =
          (openRes.data.data.data as Row[]).find(
            (row) =>
              shared ||
              (typeof row.openedBy === 'object'
                ? (row.openedBy as Row)?._id
                : row.openedBy) === user?.id
          ) || null;
        setOpenCashier(open);
        if (open) {
          const mov = await client.get(`/cashiers/${open._id}/movements`, {
            params: { limit: 8 },
          });
          // Vendas/estornos mostram o total da venda, não só a parte em dinheiro.
          setOpenCashierMovements(
            ((mov.data.data.data || []) as Row[]).map((entry) => ({
              ...entry,
              amount:
                entry.orderId && typeof entry.orderId === 'object'
                  ? ((entry.orderId as Row).amountPaid ?? (entry.orderId as Row).total)
                  : entry.amount,
            }))
          );
        } else {
          setOpenCashierMovements([]);
        }
      }
    } catch (cause) {
      setRows([]);
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [client, tenantId, screen, applied, page, isProducts, productsSearched]);
  useEffect(() => {
    startTransition(() => {
      void load();
    });
  }, [load]);

  useEffect(() => {
    if (!details) return;
    let active = true;
    const loadRelated = async () => {
      const id = details._id;
      const endpoint =
        screen.endpoint === '/customers'
          ? '/orders'
          : screen.endpoint === '/cashiers'
            ? `/cashiers/${id}/movements`
            : screen.endpoint === '/orders'
              ? '/payments'
              : '';
      if (!endpoint) return;
      try {
        const response = await client.get(endpoint, {
          params: {
            page: relatedPage,
            limit: 10,
            ...(screen.endpoint === '/customers'
              ? { customerId: id }
              : screen.endpoint === '/orders'
                ? { orderId: id }
                : {}),
          },
        });
        if (active) {
          let data = response.data.data.data as Row[];
          // Nas movimentações de caixa, vendas/estornos exibem o valor total
          // da venda (vindo do pedido populado), e não só a parte em dinheiro.
          if (screen.endpoint === '/cashiers') {
            data = data.map((mov) => ({
              ...mov,
              amount:
                mov.orderId && typeof mov.orderId === 'object'
                  ? ((mov.orderId as Row).amountPaid ?? (mov.orderId as Row).total)
                  : mov.amount,
            }));
          }
          setRelated(data);
          setRelatedPages(response.data.data.pagination.totalPages);
        }
      } catch (cause) {
        if (active) setError(errorMessage(cause));
      }
    };
    void loadRelated();
    return () => {
      active = false;
    };
  }, [details, relatedPage, client, screen.endpoint]);

  const openDetails = async (row: Row) => {
    setError('');
    setRelated([]);
    setRelatedPage(1);
    setRelatedPages(0);
    try {
      if (screen.detailKey) {
        const response = await client.get(`${screen.endpoint}/${row._id}`);
        setDetails(response.data.data[screen.detailKey]);
      } else setDetails(row);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  };
  const save = async (payload: Row) => {
    if (editor?._id)
      await client.put(`${screen.endpoint}/${editor._id}`, payload);
    else
      await client.post(screen.endpoint, {
        ...screen.params,
        ...payload,
        ...(screen.endpoint === '/users' ? { tenantId } : {}),
      });
    // Ao editar o próprio usuário, recarrega a sessão para o novo nome
    // aparecer no cabeçalho/dashboard sem precisar recarregar a página.
    if (screen.endpoint === '/users' && editor?._id === user?.id) {
      await refreshSession();
    }
    setEditor(null);
    setMessage('Registro salvo com sucesso.');
    await load();
  };
  const perform = async (payload: Row) => {
    if (!action) return;
    const url = `${screen.endpoint}/${action.row._id}`;
    // Suprimento/retirada saem da linha do produto mas registram uma
    // movimentação de estoque (auditoria e saldo tratados no backend).
    if (action.name === 'supply' || action.name === 'withdraw')
      await client.post('/stock/movements', {
        productId: action.row._id,
        type: action.name === 'supply' ? 'in' : 'out',
        ...payload,
      });
    else if (action.name === 'delete') await client.delete(url);
    else if (action.name === 'movement')
      await client.post(`${url}/movements`, payload);
    else await client.put(`${url}/${action.name}`, payload);
    setAction(null);
    setMessage('Operação concluída com sucesso.');
    await load();
  };
  const actionFields: Field[] =
    action?.name === 'supply' || action?.name === 'withdraw'
      ? [
          {
            key: 'quantity',
            label: 'Quantidade',
            type: 'number',
            min: 0.01,
            required: true,
          },
          { key: 'reason', label: 'Motivo', required: true },
          { key: 'reference', label: 'Referência' },
        ]
      : action?.name === 'movement'
      ? [
          {
            key: 'type',
            label: 'Operação',
            required: true,
            options: [
              ['sangria', 'Sangria (retirada)'],
              ['suprimento', 'Reforço (entrada)'],
            ],
          },
          {
            key: 'amount',
            label: 'Valor (R$)',
            type: 'number',
            min: 0.01,
            required: true,
          },
          { key: 'reason', label: 'Motivo' },
        ]
      : action?.name === 'cancel' && screen.endpoint === '/orders'
        ? [{ key: 'cancelReason', label: 'Motivo do cancelamento' }]
        : [];
  const canEdit =
    Boolean(screen.fields) &&
    !['/cashiers', '/stock/movements'].includes(screen.endpoint);

  return (
    <main className="mx-auto max-w-screen-2xl p-4 sm:p-8">
      <PageHeading title={screen.title} description={screen.description}>
        <div className="flex gap-2">
          {screen.endpoint === '/orders' && (
            <Link href="/management/pos" className="admin-primary">
              Nova venda
            </Link>
          )}
          {screen.endpoint === '/products' && (
            <Link href="/management/categories" className="admin-secondary">
              Gerenciar categorias
            </Link>
          )}
          {screen.endpoint === '/categories' && (
            <Link href="/management/products" className="admin-secondary">
              Gerenciar produtos
            </Link>
          )}
          {screen.endpoint === '/audit' && rows.length > 0 && (
            <button className="admin-secondary" onClick={() => window.print()}>
              Imprimir / PDF
            </button>
          )}
          {screen.fields && (
            <button
              disabled={!tenantId}
              className="admin-primary"
              onClick={async () => {
                setLastClosing(null);
                if (screen.endpoint === '/cashiers') {
                  try {
                    const response = await client.get('/cashiers', {
                      params: {
                        status: 'closed',
                        limit: 1,
                        sortBy: 'closedAt',
                        order: 'desc',
                      },
                    });
                    const last = response.data.data.data[0];
                    if (last && last.finalAmount != null) {
                      setLastClosing(Number(last.finalAmount));
                      setEditor({ initialAmount: Number(last.finalAmount) });
                      return;
                    }
                  } catch (cause) {
                    setError(errorMessage(cause));
                  }
                }
                setEditor({});
              }}
            >
              {screen.endpoint === '/cashiers'
                ? 'Abrir caixa'
                : screen.endpoint === '/stock/movements'
                  ? 'Nova movimentação'
                  : 'Novo cadastro'}
            </button>
          )}
        </div>
      </PageHeading>
      <div className="space-y-4">
        <Notice error={error} message={message} />
        {!tenantId ? (
          <Notice message="Selecione uma empresa no cabeçalho para visualizar a área administrativa do cliente." />
        ) : (
          <>
            {(screen.search || screen.filters) && (
              <form
                className="admin-panel flex flex-wrap items-end gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (
                    filters.startDueDate &&
                    filters.endDueDate &&
                    filters.startDueDate > filters.endDueDate
                  ) {
                    setError('A data inicial não pode ser posterior à final.');
                    return;
                  }
                  setPage(1);
                  // Buscar libera a primeira listagem de produtos.
                  if (isProducts) setProductsSearched(true);
                  setApplied(filters);
                }}
              >
                {screen.search && (
                  <div className="min-w-48 flex-1">
                    <label htmlFor="search" className="admin-label">
                      Pesquisar
                    </label>
                    <input
                      id="search"
                      className="admin-input"
                      value={filters.search || ''}
                      placeholder="Digite para pesquisar"
                      onChange={(event) =>
                        setFilters({ ...filters, search: event.target.value })
                      }
                    />
                  </div>
                )}
                {screen.filters?.map((field) => (
                  <div key={field.key}>
                    <label
                      htmlFor={`filter-${field.key}`}
                      className="admin-label"
                    >
                      {field.label}
                    </label>
                    {field.options ? (
                      <select
                        id={`filter-${field.key}`}
                        className="admin-input"
                        value={filters[field.key] || ''}
                        onChange={(event) =>
                          setFilters({
                            ...filters,
                            [field.key]: event.target.value,
                          })
                        }
                      >
                        <option value="">{field.emptyLabel || 'Todos'}</option>
                        {field.options.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={`filter-${field.key}`}
                        className="admin-input"
                        type={field.type || 'text'}
                        value={filters[field.key] || ''}
                        onChange={(event) =>
                          setFilters({
                            ...filters,
                            [field.key]: event.target.value,
                          })
                        }
                      />
                    )}
                  </div>
                ))}
                {/* Produtos usam apenas "Buscar" (mesma função do "Filtrar"). */}
                <button className="admin-primary">
                  {isProducts ? 'Buscar' : 'Filtrar'}
                </button>
                <button
                  type="button"
                  className="admin-secondary"
                  onClick={() => {
                    setFilters({});
                    setApplied({});
                    setPage(1);
                  }}
                >
                  Limpar
                </button>
              </form>
            )}
            {/* A contagem e a lista de produtos só aparecem após uma busca. */}
            {(!isProducts || productsSearched) && (
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>{total} registro(s)</span>
                <button
                  className="admin-secondary"
                  disabled={loading}
                  onClick={() => void load()}
                >
                  Atualizar
                </button>
              </div>
            )}
            {isCashiers && (
              <div className="admin-panel space-y-4 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-semibold text-slate-900">
                    Caixa do dia
                  </h3>
                  <div className="flex gap-2">
                    {openCashier && (
                      <>
                        {/* Abre o mesmo modal de detalhes do histórico,
                            com as movimentações do caixa aberto. */}
                        <button
                          className="admin-secondary"
                          onClick={() => void openDetails(openCashier)}
                        >
                          Detalhes
                        </button>
                        <button
                          className="admin-secondary"
                          onClick={() =>
                            setAction({
                              row: openCashier,
                              name: 'movement',
                              title: 'Sangria / reforço',
                            })
                          }
                        >
                          Sangria / reforço
                        </button>
                        {/* Regra do backend: só quem abriu o caixa pode fechá-lo,
                            então o botão some quando o caixa é de outro operador. */}
                        {(typeof openCashier.openedBy === 'object'
                          ? (openCashier.openedBy as Row)?._id
                          : openCashier.openedBy) === user?.id && (
                          <button
                            className={dangerButtonClass}
                            onClick={() =>
                              setAction({
                                row: openCashier,
                                name: 'close',
                                title: 'Fechar caixa',
                              })
                            }
                          >
                            Fechar caixa
                          </button>
                        )}
                      </>
                    )}
                    <button
                      className="admin-secondary"
                      onClick={() => setShowCashierHistory(!showCashierHistory)}
                    >
                      {showCashierHistory ? 'Ocultar histórico' : 'Ver histórico de caixas'}
                    </button>
                  </div>
                </div>
                {openCashier ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Saldo atual</p>
                        <p className="text-lg font-bold text-slate-900">
                          {currency(openCashier.balance)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Abertura</p>
                        <p className="text-lg font-bold text-slate-900">
                          {display(openCashier.openedAt, 'openedAt@date')}
                        </p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Responsável</p>
                        <p className="text-lg font-bold text-slate-900">
                          {display(openCashier.openedBy, 'openedBy')}
                        </p>
                      </div>
                    </div>
                    {openCashierMovements.length > 0 && (
                      <div>
                        <p className="mb-2 text-sm font-semibold text-slate-700">
                          Últimas movimentações
                        </p>
                        <ul className="divide-y divide-slate-100 text-sm">
                          {openCashierMovements.map((mov) => {
                            const inflow = ['suprimento', 'venda', 'recebimento_conta'].includes(
                              String(mov.type)
                            );
                            return (
                              <li key={String(mov._id)} className="flex items-center justify-between gap-3 py-1.5">
                                <span className="text-slate-600">
                                  {display(mov.type, 'type')} · {display(mov.createdAt, 'createdAt')}
                                </span>
                                <span className={`font-semibold ${inflow ? 'text-emerald-700' : 'text-red-700'}`}>
                                  {inflow ? '+' : '-'} {currency(mov.amount)}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-slate-500">
                    Nenhum caixa aberto no momento. Abra um caixa para começar a operar.
                  </p>
                )}
              </div>
            )}
            {(isCashiers &&
              !showCashierHistory &&
              !(filters.search || applied.search || '').trim()) ||
            (isProducts && !productsSearched) ? null : loading ? (
              <div role="status" className="admin-panel py-12 text-center">
                Carregando registros...
              </div>
            ) : (
              <DataTable
                rows={rows}
                columns={screen.columns}
                actions={(row) => (
                  <>
                    <button
                      className={actionButtonClass}
                      onClick={() => void openDetails(row)}
                    >
                      Detalhes
                    </button>
                    {/* Suprimento/retirada direto na linha do produto —
                        exibidos só para quem tem stock:supply (admin/master
                        ou quem recebeu a permissão). */}
                    {screen.endpoint === '/products' &&
                      row.isActive !== false &&
                      hasPermission(user?.permissions, 'stock:supply') && (
                        <>
                          <button
                            className={actionButtonClass}
                            onClick={() =>
                              setAction({
                                row,
                                name: 'supply',
                                title: `Suprimento · ${display(row.name)}`,
                              })
                            }
                          >
                            Suprimento
                          </button>
                          <button
                            className={actionButtonClass}
                            onClick={() =>
                              setAction({
                                row,
                                name: 'withdraw',
                                title: `Retirada · ${display(row.name)}`,
                              })
                            }
                          >
                            Retirada
                          </button>
                        </>
                      )}
                    {screen.endpoint === '/users' &&
                      row.role !== 'master' &&
                      (user?.role === 'admin' || user?.role === 'master') && (
                        <Link
                          className={actionButtonClass}
                          href={`/permissions?user=${String(row._id)}`}
                        >
                          Permissões
                        </Link>
                      )}
                    {canEdit &&
                      row.status !== 'cancelled' &&
                      row.role !== 'master' && (
                        <button
                          className={actionButtonClass}
                          onClick={() => setEditor(row)}
                        >
                          Editar
                        </button>
                      )}
                    {screen.actions
                      ?.filter(([name]) =>
                        screen.endpoint === '/orders'
                          ? row.status === 'paid' &&
                            (name !== 'cancel' || canCancelOrder(row, user?.role))
                          : screen.endpoint === '/cashiers'
                            ? row.status === 'open' &&
                              (name === 'close' ||
                                display(row.openedBy) === user?.id ||
                                (row.openedBy as Row)?._id === user?.id)
                            : name === 'pay'
                              ? row.status === 'pending'
                              : row.status !== 'cancelled'
                      )
                      .map(([name, title]) => (
                        <button
                          key={name}
                          className={
                            name === 'cancel' || name === 'delete'
                              ? dangerButtonClass
                              : actionButtonClass
                          }
                          onClick={() => setAction({ row, name, title })}
                        >
                          {title}
                        </button>
                      ))}
                  </>
                )}
              />
            )}
            {!(
              isCashiers &&
              !showCashierHistory &&
              !(filters.search || applied.search || '').trim()
            ) && (
            <div className="flex items-center justify-end gap-3">
              <button
                className="admin-secondary"
                disabled={loading || page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Anterior
              </button>
              <span className="text-sm">
                Página {page} de {Math.max(1, totalPages)}
              </span>
              <button
                className="admin-secondary"
                disabled={loading || page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Próxima
              </button>
            </div>
            )}
          </>
        )}
      </div>
      {editor && (
        <Modal
          title={`${editor._id ? 'Editar' : 'Novo'} · ${screen.title}`}
          onClose={() => setEditor(null)}
        >
          <RecordForm
            fields={(screen.fields || [])
              .map((field) =>
                // Após o primeiro caixa, o valor inicial é travado no saldo de
                // fechamento anterior (o backend ignora qualquer outro valor).
                field.key === 'initialAmount' &&
                screen.endpoint === '/cashiers' &&
                !editor._id &&
                lastClosing !== null
                  ? {
                      ...field,
                      disabled: true,
                      hint: 'O caixa abre com o saldo do fechamento anterior.',
                    }
                  : field
              )
              .filter(
                (field) =>
                  !(
                    editor._id &&
                    screen.endpoint === '/users' &&
                    user?.role !== 'master' &&
                    field.key === 'role'
                  )
              )
              .map((field) =>
                // Na tela de movimentações, cada tipo aparece só para quem
                // tem a permissão correspondente (o backend bloqueia de
                // qualquer forma via stock:supply / stock:adjust).
                field.key === 'type' && screen.endpoint === '/stock/movements'
                  ? {
                      ...field,
                      options: field.options?.filter(([value]) =>
                        hasPermission(
                          user?.permissions,
                          `stock:${value === 'adjust' ? 'adjust' : 'supply'}`
                        )
                      ),
                    }
                  : field
              )}
            initial={editor}
            editing={Boolean(editor._id)}
            onSubmit={save}
            onCancel={() => setEditor(null)}
          />
        </Modal>
      )}
      {details && (
        <Modal
          title={`Detalhes · ${screen.title}`}
          onClose={() => setDetails(null)}
        >
          {screen.endpoint === '/orders' ? (
            <OrderDetails row={details} />
          ) : screen.endpoint === '/cashiers' ? (
            <CashierDetails row={details} />
          ) : (
            <RecordDetails row={details} />
          )}
          {['/customers', '/orders', '/cashiers'].includes(screen.endpoint) && (
            <section className="mt-6 space-y-3">
              <h3 className="font-semibold">
                {screen.endpoint === '/customers'
                  ? 'Histórico de compras'
                  : screen.endpoint === '/orders'
                    ? 'Pagamentos'
                    : 'Movimentações de caixa'}
              </h3>
              <DataTable
                rows={related}
                footer={
                  // Nos detalhes da venda, juros e total final ficam dentro da
                  // lista de pagamentos — amountPaid já inclui os juros.
                  screen.endpoint === '/orders' && details ? (
                    <tfoot>
                      {(() => {
                        // Juros = soma do interestAmount dos pagamentos da venda.
                        const interest = (
                          (details.paymentIds as Row[]) || []
                        ).reduce(
                          (sum, p) => sum + (Number(p.interestAmount) || 0),
                          0
                        );
                        return interest > 0 ? (
                          <tr className="border-t border-slate-200">
                            <td
                              className="px-4 py-2.5 text-sm text-slate-600"
                              colSpan={2}
                            >
                              Juros (crédito)
                            </td>
                            <td className="px-4 py-2.5 text-right text-sm font-medium text-slate-600">
                              + {display(interest, 'interestAmount')}
                            </td>
                          </tr>
                        ) : null;
                      })()}
                      <tr className="border-t border-slate-200 bg-slate-50">
                        <td
                          className="px-4 py-3 text-sm font-bold text-slate-900"
                          colSpan={2}
                        >
                          Total
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-slate-900">
                          {display(details.amountPaid ?? details.total, 'total')}
                        </td>
                      </tr>
                    </tfoot>
                  ) : undefined
                }
                columns={
                  screen.endpoint === '/customers'
                    ? [
                        ['orderNumber', 'Venda'],
                        ['createdAt', 'Data'],
                        ['total', 'Total'],
                        ['status', 'Situação'],
                      ]
                    : screen.endpoint === '/orders'
                      ? [
                          ['method', 'Forma'],
                          ['installments', 'Parcelas'],
                          ['amount', 'Valor', 'right'],
                        ]
                      : [
                          ['createdAt', 'Data'],
                          ['reason', 'Motivo'],
                          ['amount', 'Valor', 'right'],
                        ]
                }
                actions={
                  screen.endpoint === '/customers'
                    ? (row) => (
                        <button
                          className="text-blue-700 hover:underline"
                          onClick={async () => {
                            try {
                              const response = await client.get(
                                `/orders/${row._id}`
                              );
                              setOrderDetails(response.data.data.order);
                            } catch (cause) {
                              setError(errorMessage(cause));
                            }
                          }}
                        >
                          Ver venda
                        </button>
                      )
                    : undefined
                }
              />
              <div className="flex justify-end gap-2">
                <button
                  className="admin-secondary"
                  disabled={relatedPage <= 1}
                  onClick={() => setRelatedPage(relatedPage - 1)}
                >
                  Anterior
                </button>
                <button
                  className="admin-secondary"
                  disabled={relatedPage >= relatedPages}
                  onClick={() => setRelatedPage(relatedPage + 1)}
                >
                  Próxima
                </button>
              </div>
            </section>
          )}
        </Modal>
      )}
      {orderDetails && (
        <Modal
          title={`Venda ${display(orderDetails.orderNumber, 'orderNumber')}`}
          onClose={() => setOrderDetails(null)}
        >
          <OrderDetails row={orderDetails} />
        </Modal>
      )}
      {action && action.name === 'pay' && screen.endpoint === '/bills' ? (
        <PayBillModal
          bill={action.row}
          onClose={() => setAction(null)}
          onDone={async () => {
            setAction(null);
            setMessage('Operação concluída com sucesso.');
            await load();
          }}
        />
      ) : (
        action && (
        <Modal title={action.title} onClose={() => setAction(null)}>
          <p className="mb-5 text-sm text-slate-600">
            {action.name === 'cancel' && screen.endpoint === '/orders'
              ? 'O cancelamento estorna o estoque e cancela os pagamentos vinculados. Confirme para continuar.'
              : action.name === 'close'
                ? 'O fechamento calcula o saldo final e encerra este caixa. Confirme para continuar.'
                : 'Confira os dados antes de confirmar a operação.'}
          </p>
          <RecordForm
            fields={actionFields}
            onSubmit={perform}
            onCancel={() => setAction(null)}
            submitLabel="Confirmar operação"
          />
        </Modal>
        )
      )}
      {screen.endpoint === '/audit' && rows.length > 0 && (
        <div className="print-area">
          <h2 style={{ fontWeight: 'bold', marginBottom: 12 }}>
            Relatório de auditoria · {screen.title}
          </h2>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {screen.columns.map(([key, label]) => (
                  <th
                    key={key}
                    style={{ textAlign: 'left', borderBottom: '1px solid #000', padding: 4 }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index}>
                  {screen.columns.map(([key]) => (
                    <td key={key} style={{ borderBottom: '1px solid #ccc', padding: 4 }}>
                      {display(getValue(row, key), key)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

// Modal de liquidação de conta: permite pagar/receber totalmente pelo caixa
// aberto do usuário, combinar caixa + forma externa ou liquidar só por fora.
function PayBillModal({
  bill,
  onClose,
  onDone,
}: {
  bill: Row;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const { client } = useWorkspaceApi();
  const { user } = useAuth();
  const amount = Number(bill.amount) || 0;
  const isPay = bill.type === 'pay';

  const [cashier, setCashier] = useState<Row | null>(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'cashier' | 'combined' | 'external'>('cashier');
  const [cashierAmount, setCashierAmount] = useState('');
  const [externalMethod, setExternalMethod] = useState('pix');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [cashiers, company] = await Promise.all([
          loadOptions(client, '/cashiers'),
          client.get('/tenants/me'),
        ]);
        // Modo compartilhado: qualquer caixa aberto da empresa pode ser usado.
        const shared = company.data.data.tenant?.cashierMode === 'shared';
        const open = cashiers.find(
          (row) =>
            row.status === 'open' &&
            (shared ||
              (typeof row.openedBy === 'object'
                ? (row.openedBy as Row)?._id
                : row.openedBy) === user?.id)
        );
        if (!active) return;
        if (open) {
          const detail = await client.get(`/cashiers/${open._id}`);
          if (!active) return;
          const current = detail.data.data.cashier;
          setCashier(current);
          setBalance(Number(current.balance ?? 0));
        }
      } catch (cause) {
        if (active) setError(errorMessage(cause));
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [client, user?.id]);

  const insufficient = cashier ? amount > balance : false;
  const cashierPart =
    mode === 'cashier' ? amount : Number(cashierAmount) || 0;
  const externalPart = mode === 'external' ? amount : amount - cashierPart;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      let payload: Row = {};
      if (mode !== 'external') {
        if (!cashier) throw new Error('Você não possui um caixa aberto.');
        if (cashierPart <= 0)
          throw new Error('O valor retirado do caixa deve ser maior que zero.');
        if (cashierPart > amount)
          throw new Error('O valor do caixa não pode exceder o total da conta.');
        if (cashierPart > balance)
          throw new Error('O saldo do caixa não é suficiente para esse valor.');
        payload = { cashierId: cashier._id };
        if (externalPart > 0) {
          payload.externalAmount = externalPart;
          payload.externalMethod = externalMethod;
        }
      } else {
        payload = { externalMethod };
      }
      setBusy(true);
      await client.put(`/bills/${bill._id}/pay`, payload);
      await onDone();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={`${isPay ? 'Pagar' : 'Receber'} · ${String(bill.description || '')}`}
      onClose={onClose}
    >
      {loading ? (
        <p role="status" className="text-sm text-slate-500">
          Carregando caixa...
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Notice error={error} />
          <p className="text-sm text-slate-600">
            Valor da conta:{' '}
            <strong>{display(amount, 'amount')}</strong>
            {cashier && (
              <>
                {' · '}Saldo do caixa:{' '}
                <strong>{display(balance, 'balance')}</strong>
              </>
            )}
          </p>
          {!cashier && (
            <Notice message="Você não possui caixa aberto. A liquidação será registrada apenas como pagamento externo." />
          )}
          {cashier && insufficient && (
            <Notice
              error={`O saldo atual do caixa (${display(balance, 'balance')}) não é suficiente para liquidar esta conta por completo. Você pode combinar com uma forma externa.`}
            />
          )}
          <div className="space-y-2">
            {cashier && !insufficient && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={mode === 'cashier'}
                  onChange={() => setMode('cashier')}
                />
                {isPay ? 'Pagar' : 'Receber'} totalmente pelo caixa
              </label>
            )}
            {cashier && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={mode === 'combined'}
                  onChange={() => setMode('combined')}
                />
                Combinar caixa + forma externa
              </label>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={mode === 'external'}
                onChange={() => setMode('external')}
              />
              Somente forma externa (não movimenta o caixa)
            </label>
          </div>
          {mode === 'combined' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="admin-label">
                Valor do caixa (R$)
                <input
                  className="admin-input mt-1"
                  type="number"
                  min="0.01"
                  max={Math.min(amount, balance)}
                  step="0.01"
                  required
                  value={cashierAmount}
                  onChange={(event) => setCashierAmount(event.target.value)}
                />
              </label>
              <p className="self-end text-sm text-slate-600">
                Restante por fora:{' '}
                <strong>{display(Math.max(0, externalPart), 'amount')}</strong>
              </p>
            </div>
          )}
          {(mode === 'combined' && externalPart > 0) || mode === 'external' ? (
            <label className="admin-label">
              Identificador da forma externa
              <select
                className="admin-input mt-1"
                value={externalMethod}
                onChange={(event) => setExternalMethod(event.target.value)}
              >
                {[
                  ['pix', 'Pix'],
                  ['cash', 'Dinheiro'],
                  ['credit_card', 'Cartão de crédito'],
                  ['debit_card', 'Cartão de débito'],
                  ['other', 'Outro'],
                ].map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="admin-secondary"
              onClick={onClose}
              disabled={busy}
            >
              Voltar
            </button>
            <button className="admin-primary" disabled={busy}>
              {busy ? 'Confirmando...' : 'Confirmar liquidação'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
