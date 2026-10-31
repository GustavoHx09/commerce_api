'use client';

import {
  startTransition,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useWorkspaceApi } from '../AdminShell';
import { useAuth } from '../context/AuthContext';
import UserPermissionsEditor from '../permissions/components/UserPermissionsEditor';
import type { PanelUser, PermissionPreset } from '../permissions/types';
import {
  ACTION_LABELS,
  groupPermissionsByResource,
  hasPermission,
  RESOURCE_LABELS,
} from '@/lib/permissions';
import {
  display,
  formatAddress,
  getValue,
  maskDocument,
  type Field,
  type Row,
  type Screen,
} from './config';
import {
  DataTable,
  errorMessage,
  loadOptions,
  Modal,
  Notice,
  PageHeading,
  RecordForm,
  validateFieldValue,
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
  updatedAt: 'Última atualização',
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
  contactId: 'Contato',
  notes: 'Observações',
  type: 'Tipo',
  reason: 'Motivo',
  reference: 'Referência',
  previousQuantity: 'Quantidade anterior',
  newQuantity: 'Novo saldo',
  action: 'Operação',
  actorId: 'Responsável',
  entityId: 'Registro',
  entityName: 'Observação',
  entityType: 'Entidade',
  changes: 'Alterações',
  snapshot: 'Estado registrado',
  from: 'Anterior',
  to: 'Novo',
  method: 'Forma de pagamento',
  orderNumber: 'Nº da venda',
  cashierNumber: 'Nº do caixa',
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
  permissions: 'Permissões',
  grantedPermissions: 'Permissões concedidas',
  revokedPermissions: 'Permissões revogadas',
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

// Estorno de conta segue a mesma regra do cancelamento de venda, só que a
// janela conta a partir da liquidação (paidAt), não da criação.
const canReverseBill = (row: Row, role?: string) =>
  ['admin', 'master'].includes(role || '') ||
  Date.now() - new Date(String(row.paidAt)).getTime() <= 30 * 60 * 1000;

// Recurso de permissão correspondente ao endpoint da tela — espelha o
// authorize(...) das rotas da API.
const PERM_BY_ENDPOINT: Record<string, string> = {
  '/products': 'products',
  '/categories': 'categories',
  '/customers': 'customers',
  '/suppliers': 'suppliers',
  '/users': 'users',
  '/orders': 'orders',
  '/cashiers': 'cashier',
  '/bills': 'bills',
  '/audit': 'audit',
};

// Ação da tela → permissão exigida. O cancelamento de venda usa
// orders:delete na API; suprimento/retirada/acerto usam as permissões
// dedicadas de estoque; o restante segue o :write/:delete do recurso.
const actionPerm = (endpoint: string, name: string): string | null => {
  const res = PERM_BY_ENDPOINT[endpoint];
  if (name === 'cancel')
    return endpoint === '/orders'
      ? 'orders:delete'
      : res
        ? `${res}:write`
        : null;
  if (name === 'supply' || name === 'withdraw' || name === 'stockMovement')
    return 'stock:supply';
  if (name === 'adjust') return 'stock:adjust';
  if (name === 'delete') return res ? `${res}:delete` : null;
  return res ? `${res}:write` : null;
};

// Tipos de movimentação que entram dinheiro no caixa — espelha
// INFLOW_TYPES do backend (cashierService.js).
const isCashierInflow = (type: string) =>
  ['suprimento', 'venda', 'recebimento_conta'].includes(type);

const hiddenFields = new Set([
  '_id',
  'password',
  'passwordChangedAt',
  'tenantId',
  '__v',
  'deletedAt',
  'permissionPresetId',
  // Campos legados presentes em contas criadas pelo seed antigo — fora do
  // schema atual (o vínculo correto é contactId/contactType).
  'supplierId',
  'customerId',
  // Metadado do populate do contato (coleção de origem) — não é informação
  // de negócio para o usuário.
  'contactType',
  // Campo removido do cadastro de fornecedores — dados antigos não viram card.
  'contactName',
  'permissions',
  'revokedPermissions',
  'snapshot',
  // Na auditoria o registro legível vem em entityName — o id bruto não agrega.
  'entityId',
]);

// Campos da auditoria que guardam listas de permissões do catálogo
// ("recurso:acao") — exibidos traduzidos, nunca como código cru.
const permissionFields = new Set([
  'permissions',
  'grantedPermissions',
  'revokedPermissions',
]);

// Rótulos dos tipos de movimentação de estoque exibidos na auditoria de
// produtos — espelha o enum `type` do stockMovementModel do backend.
const stockMovementLabels: Record<string, string> = {
  in: 'Suprimento',
  out: 'Retirada',
  adjust: 'Acerto de estoque',
};

// Traduz uma permissão do catálogo ("recurso:acao") para um rótulo legível
// ("Recurso: Ação"), na mesma nomenclatura da grade de permissões do painel.
const permissionLabel = (permission: unknown): string => {
  if (permission === '*') return 'Todas as permissões';
  if (typeof permission !== 'string') return display(permission);
  const [resource, action] = permission.split(':');
  const resourceLabel = RESOURCE_LABELS[resource] || resource;
  const actionLabel = ACTION_LABELS[action] || action;
  return action ? `${resourceLabel}: ${actionLabel}` : resourceLabel;
};

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

// Detalhes de auditoria no mesmo padrão visual das demais telas: cabeçalho
// em cards (entidade, operação, responsável, registro e data) e uma tabela
// comparativa — "Dados anteriores" × "Dados novos" por campo. Em criações a
// coluna anterior fica vazia; em exclusões, a coluna nova. Listas de
// permissões viram cards agrupados por tópico (ex.: "Dashboard" → selo
// "Leitura"), destacando em verde o que entrou e em vermelho o que saiu.
function AuditDetails({ row }: { row: Row }) {
  const changes = (row.changes || {}) as Row;
  // Updates trazem {from,to} por campo; create/delete trazem o documento.
  const isDiff = Object.values(changes).some(
    (value) =>
      value &&
      typeof value === 'object' &&
      'from' in (value as Row) &&
      'to' in (value as Row)
  );
  // Fechamento de caixa: closedBy e finalAmount saem das linhas e viram
  // colunas dedicadas (contexto do fechamento), ancoradas na linha da
  // Situação — o valor exibido é o lado "novo" do diff.
  const cashierClose = Boolean(
    row.entityType === 'cashier' &&
      changes.closedBy &&
      typeof changes.closedBy === 'object' &&
      'to' in (changes.closedBy as Row)
  );
  // Abertura de caixa (criação): mesmo formato do fechamento — openedBy e
  // initialAmount viram colunas de contexto na linha da Situação.
  const cashierOpen =
    row.entityType === 'cashier' &&
    row.action === 'create' &&
    'openedBy' in changes;
  // Campos que não agregam no detalhe da auditoria: ativo, timestamps
  // técnicos e datas de abertura/fechamento (a data está no cabeçalho),
  // createdBy (o responsável já aparece no cabeçalho) e openedBy em
  // alterações — no fechamento ele aparece só como artefato de
  // serialização; o que interessa é o "Fechado por". Permissões são
  // exceção ao hiddenFields: é a alteração central dos presets.
  const entries = Object.entries(changes).filter(
    ([key]) =>
      (!hiddenFields.has(key) ||
        ['permissions', 'grantedPermissions', 'revokedPermissions'].includes(
          key
        )) &&
      ![
        'isActive',
        'updatedAt',
        'createdAt',
        'createdBy',
        'openedAt',
        'closedAt',
      ].includes(key) &&
      !(isDiff && key === 'openedBy') &&
      // Em fechamento de caixa os dois campos viram colunas próprias.
      !(cashierClose && ['closedBy', 'finalAmount'].includes(key)) &&
      // Na abertura, openedBy e initialAmount viram colunas; o número do
      // caixa já aparece no cabeçalho ("Caixa #N") em qualquer log de caixa.
      !(cashierOpen && ['openedBy', 'initialAmount'].includes(key)) &&
      !(row.entityType === 'cashier' && key === 'cashierNumber')
  );
  // Referências internas (ids de vínculo) viram "—": o registro legível já
  // aparece no cabeçalho; ids crus não agregam.
  const auditValue = (value: unknown, key: string) => {
    if (typeof value === 'string' && /^[0-9a-f]{24}$/i.test(value)) return '—';
    if (value && typeof value === 'object') {
      // Listas (permissões, itens) viram texto separado por vírgula.
      if (Array.isArray(value))
        return value.map((item) => display(item, key)).join(', ') || '—';
      const obj = value as Row;
      // Snapshot populado pelo backend traz { name } — exibe o nome.
      if (typeof obj.name === 'string' && obj.name) return obj.name;
      // Endereços viram uma linha legível com todos os campos preenchidos —
      // complemento e CEP inclusos para não esconder mudanças sutis (ex.:
      // alterar só o complemento). O JSON cru não agrega.
      if (key === 'address' || 'street' in obj || 'zipCode' in obj) {
        const text = [
          obj.street,
          obj.number,
          obj.complement,
          obj.neighborhood,
          obj.city && obj.state
            ? `${obj.city}/${obj.state}`
            : obj.city || obj.state,
          obj.zipCode ? `CEP ${display(obj.zipCode, 'zipCode')}` : null,
        ]
          .filter(Boolean)
          .join(', ');
        return text || '—';
      }
      // ObjectId serializado cru pelo BSON (logs antigos) — não agrega.
      if ('i0' in obj) return '—';
      return JSON.stringify(value);
    }
    return display(value, key);
  };
  // Listas de permissões viram cards agrupados por recurso (tópico), com as
  // ações como selos — mesma organização da grade de permissões do painel.
  // Na comparação anterior × novo, o selo fica verde quando a permissão
  // entrou e vermelho quando saiu; sem comparação, todos ficam neutros.
  const renderPermissions = (
    value: unknown,
    side: 'from' | 'to',
    otherSide: unknown
  ): ReactNode => {
    const items = Array.isArray(value) ? value : [];
    if (!items.length) return <span className="text-slate-400">—</span>;
    // Acesso total ("*") dispensa agrupamento.
    if (items.includes('*'))
      return (
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
          Todas as permissões
        </span>
      );
    const other = new Set(Array.isArray(otherSide) ? otherSide : []);
    const groups = groupPermissionsByResource(
      items.filter((item): item is string => typeof item === 'string')
    );
    // Itens fora do padrão "recurso:acao" (não esperado) viram texto simples.
    if (!groups.length)
      return <span>{items.map(permissionLabel).join(', ')}</span>;
    return (
      <ul className="flex flex-wrap items-start gap-2">
        {groups.map((group) => (
          <li
            key={group.resource}
            className="rounded-md border border-slate-200 bg-white p-2"
          >
            <p className="mb-1 text-[11px] font-semibold uppercase text-slate-500">
              {group.label}
            </p>
            <ul className="flex flex-wrap gap-1">
              {group.permissions.map((permission) => {
                // Selo verde = permissão adicionada; vermelho = removida.
                const changed = !other.has(permission);
                const tone = changed
                  ? side === 'to'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-700'
                  : 'bg-slate-100 text-slate-700';
                const action = permission.split(':')[1];
                return (
                  <li
                    key={permission}
                    className={`rounded px-2 py-0.5 text-xs ${tone}`}
                  >
                    {ACTION_LABELS[action] || permissionLabel(permission)}
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    );
  };
  // Pagamentos da venda: cada item resolvido pelo backend
  // ({ method, amount, installments }) vira um selo com a forma, as
  // parcelas (quando >1x) e o valor — ex.: "Dinheiro · R$ 249,00".
  const renderPayments = (value: unknown): ReactNode => {
    const items = Array.isArray(value) ? value : [];
    if (!items.length) return <span className="text-slate-400">—</span>;
    return (
      <ul className="flex flex-wrap gap-1">
        {items.map((item, index) => {
          const payment = (item || {}) as Row;
          const label =
            typeof payment.method === 'string' && payment.method
              ? [
                  display(payment.method, 'method'),
                  Number(payment.installments) > 1
                    ? `${payment.installments}x`
                    : null,
                  payment.amount != null
                    ? display(payment.amount, 'amount')
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')
              : '—';
          return (
            <li
              key={index}
              className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
            >
              {label}
            </li>
          );
        })}
      </ul>
    );
  };
  // Pagamentos e permissões têm renderização própria em selos; os demais
  // campos seguem o texto simples de auditValue.
  const renderValue = (
    value: unknown,
    key: string,
    side: 'from' | 'to',
    otherSide: unknown
  ): ReactNode =>
    key === 'paymentIds'
      ? renderPayments(value)
      : permissionFields.has(key)
        ? renderPermissions(value, side, otherSide)
        : auditValue(value, key);
  // Contexto da movimentação de estoque anexado pelo backend a logs de
  // produto. Vendas e cancelamentos são reconhecidos pela referência
  // "Venda #N" gravada na movimentação.
  const stockContext = (row.stockContext || null) as Row | null;
  const isSaleMovement = /^venda\s*#/i.test(
    String(stockContext?.reference || '')
  );
  const movementTypeLabel = !stockContext
    ? ''
    : isSaleMovement
      ? stockContext.type === 'in'
        ? 'Cancelamento de venda'
        : 'Venda'
      : stockMovementLabels[String(stockContext.type)] ||
        String(stockContext.type);
  const movementReason = !stockContext
    ? ''
    : isSaleMovement
      ? String(stockContext.reference)
      : [stockContext.reason, stockContext.reference]
          .filter(Boolean)
          .join(' — ') || '—';
  const headCell =
    'px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500';
  const cell = 'px-3 py-2 text-sm';

  return (
    <div className="space-y-5">
      <dl className="grid gap-3 sm:grid-cols-2">
        {[
          ['Entidade', display(row.entityType, 'entityType')],
          ['Operação', display(row.action, 'action')],
          [
            'Responsável',
            display(
              (row.actorId as Row)?.name ??
                (row.actorId as Row)?.email ??
                row.actorId
            ),
          ],
          [
            // O nome exibido é o do registro alterado — rotulado conforme
            // a entidade (preset de permissões, conta, caixa...).
            row.entityType === 'permissionPreset'
              ? 'Predefinição alterada'
              : 'Observação',
            display(row.entityName),
          ],
          ['Data', display(row.createdAt, 'createdAt')],
        ].map(([label, value]) => (
          <div key={String(label)} className={detailBoxClass}>
            <dt className={detailLabelClass}>{label}</dt>
            <dd className={detailValueClass}>{value}</dd>
          </div>
        ))}
      </dl>

      {entries.length > 0 && (
        <section className="space-y-2">
          <h3 className="font-semibold text-slate-900">
            {isDiff ? 'Alterações' : 'Dados registrados'}
          </h3>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className={headCell}>Campo</th>
                  {/* Tipo/Motivo da movimentação só existem em logs de
                      produto com diff de estoque (stockContext). */}
                  {!!stockContext && (
                    <>
                      <th className={headCell}>Tipo</th>
                      <th className={headCell}>Motivo</th>
                    </>
                  )}
                  {/* Sem diff não existe comparação: criação mostra só os
                      dados novos e exclusão só os anteriores. */}
                  {isDiff ? (
                    <>
                      <th className={headCell}>Dados anteriores</th>
                      <th className={headCell}>Dados novos</th>
                    </>
                  ) : (
                    <th className={headCell}>
                      {row.action === 'delete'
                        ? 'Dados anteriores'
                        : 'Dados novos'}
                    </th>
                  )}
                  {/* Fechado por/Valor final só existem em fechamento de
                      caixa; Aberto por/Valor inicial, na abertura. */}
                  {cashierClose && (
                    <>
                      <th className={headCell}>Fechado por</th>
                      <th className={headCell}>Valor final</th>
                    </>
                  )}
                  {cashierOpen && (
                    <>
                      <th className={headCell}>Aberto por</th>
                      <th className={headCell}>Valor inicial</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map(([key, value]) => {
                  // Em updates/restores o campo é um diff {from,to}; em
                  // criação o valor entra como "novo" e em exclusão como
                  // "anterior".
                  const isChange =
                    value &&
                    typeof value === 'object' &&
                    'to' in (value as Row);
                  const from = isChange
                    ? (value as Row).from
                    : row.action === 'delete'
                      ? value
                      : undefined;
                  const to = isChange
                    ? (value as Row).to
                    : row.action === 'delete'
                      ? undefined
                      : value;
                  return (
                    <tr key={key}>
                      <td className={`${cell} font-medium align-top`}>
                        {detailLabels[key] || key}
                      </td>
                      {/* A movimentação registrada explica o diff do campo
                          quantityInStock — demais campos ficam sem contexto. */}
                      {!!stockContext && (
                        <>
                          <td className={`${cell} align-top`}>
                            {key === 'quantityInStock'
                              ? movementTypeLabel
                              : '—'}
                          </td>
                          <td className={`${cell} align-top`}>
                            {key === 'quantityInStock'
                              ? movementReason
                              : '—'}
                          </td>
                        </>
                      )}
                      {isDiff ? (
                        <>
                          <td className={`${cell} align-top`}>
                            {renderValue(from, key, 'from', to)}
                          </td>
                          <td className={`${cell} align-top`}>
                            {renderValue(to, key, 'to', from)}
                          </td>
                        </>
                      ) : (
                        <td className={`${cell} align-top`}>
                          {renderValue(
                            value,
                            key,
                            row.action === 'delete' ? 'from' : 'to',
                            undefined
                          )}
                        </td>
                      )}
                      {/* Quem fechou e o valor final aparecem na linha da
                          Situação — são o contexto do fechamento. */}
                      {cashierClose && (
                        <>
                          <td className={`${cell} align-top`}>
                            {key === 'status'
                              ? auditValue(
                                  (changes.closedBy as Row)?.to,
                                  'closedBy'
                                )
                              : '—'}
                          </td>
                          <td className={`${cell} align-top`}>
                            {key === 'status'
                              ? auditValue(
                                  (changes.finalAmount as Row)?.to,
                                  'finalAmount'
                                )
                              : '—'}
                          </td>
                        </>
                      )}
                      {/* Na abertura, quem abriu e o valor inicial também
                          aparecem na linha da Situação. */}
                      {cashierOpen && (
                        <>
                          <td className={`${cell} align-top`}>
                            {key === 'status'
                              ? auditValue(changes.openedBy, 'openedBy')
                              : '—'}
                          </td>
                          <td className={`${cell} align-top`}>
                            {key === 'status'
                              ? auditValue(
                                  changes.initialAmount,
                                  'initialAmount'
                                )
                              : '—'}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
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

// Detalhes de um registro em grade compacta de cards. Quando a tela permite
// edição, o botão "Editar" habilita os campos no próprio modal — sem abrir
// outro — e vira "Salvar"; dados gerenciados pelo sistema (saldo, criador,
// datas) permanecem somente leitura. Ações extras (ex.: suprimento/retirada
// de estoque) são injetadas pelo rodapé via `actions`.
function EditableDetails({
  row,
  fields,
  endpoint,
  detailKey,
  canEdit,
  actions,
  onSaved,
}: {
  row: Row;
  fields: Field[];
  endpoint: string;
  detailKey?: string;
  canEdit: boolean;
  actions?: React.ReactNode;
  onSaved: (updated: Row) => void;
}) {
  const { client } = useWorkspaceApi();
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [options, setOptions] = useState<Record<string, Row[]>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Campos editáveis: remove os exclusivos de criação (ex.: senha inicial)
  // e o perfil de usuário para quem não é master (mesma regra do RecordForm).
  const editableFields = fields.filter(
    (field) =>
      !field.createOnly &&
      !(
        endpoint === '/users' &&
        field.key === 'role' &&
        user?.role !== 'master'
      )
  );

  // Carrega as opções de campos com fonte externa (ex.: categoria, produto).
  const sources = [
    ...new Set(editableFields.flatMap((f) => (f.source ? [f.source] : []))),
  ].join('|');
  useEffect(() => {
    if (!sources) return;
    let active = true;
    Promise.all(
      sources
        .split('|')
        .map(async (source) => [source, await loadOptions(client, source)] as const)
    )
      .then((entries) => {
        if (active) setOptions(Object.fromEntries(entries));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [sources, client]);

  const startEditing = () => {
    setError('');
    setValues(
      Object.fromEntries(
        editableFields.map((field) => {
          let value = getValue(row, field.key);
          if (value && typeof value === 'object') value = (value as Row)._id;
          if (field.key === 'isActive')
            value = value === false ? 'false' : 'true';
          if (field.key === 'documentType' && value == null) value = 'cpf';
          if (field.type === 'date' && value) value = String(value).slice(0, 10);
          return [field.key, value == null ? '' : String(value)];
        })
      )
    );
    setEditing(true);
  };

  const save = async () => {
    setError('');
    const payload: Row = {};
    for (const field of editableFields) {
      if (field.readOnly) continue;
      const raw = (values[field.key] || '').trim();
      // Mesma validação do RecordForm (regra 2): formato de email,
      // documento, telefone, CEP, cor e vencimento — além de required/min.
      const invalid = validateFieldValue(field, raw, values);
      if (invalid) {
        setError(invalid);
        return;
      }
      // Numérico vazio não é enviado; strings vazias seguem como "" para
      // permitir limpar campos opcionais.
      const value: unknown = !raw
        ? field.type === 'number' || field.options || field.source
          ? undefined
          : ''
        : field.key === 'isActive'
          ? raw === 'true'
          : field.type === 'number'
            ? Number(raw)
            : raw;
      if (value === undefined) continue;
      const parts = field.key.split('.');
      if (parts.length === 2)
        payload[parts[0]] = {
          ...((payload[parts[0]] as Row) || {}),
          [parts[1]]: value,
        };
      else payload[field.key] = value;
    }
    setBusy(true);
    try {
      const response = await client.put(`${endpoint}/${row._id}`, payload);
      setEditing(false);
      onSaved(response.data.data[detailKey || ''] || response.data.data);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  // Chaves já cobertas pelos campos da tela (inclui grupos como "address.*").
  const covered = new Set(editableFields.map((f) => f.key.split('.')[0]));
  // Campos do documento sem formulário viram cards somente leitura no fim.
  const readOnly = Object.entries(row).filter(
    ([key, value]) =>
      value != null &&
      !hiddenFields.has(key) &&
      !covered.has(key) &&
      !Array.isArray(value) &&
      // "Criado em" é redundante com "Última atualização" nas outras telas;
      // em contas ele compõe o par de datas do fim (ver pairTail).
      // Descrição foi removida do formulário de produtos e não aparece nos
      // detalhes.
      (endpoint === '/bills' || key !== 'createdAt') &&
      key !== 'description' &&
      // Em contas, "Tipo" (a pagar/a receber) já é a própria tela, "Ativo"
      // não agrega e "Última atualização" é redundante com "Liquidada em".
      // Dados da liquidação (caixa, valores, meio externo) só aparecem
      // depois de paga.
      !(endpoint === '/bills' &&
        (key === 'type' ||
          key === 'isActive' ||
          key === 'updatedAt' ||
          (row.status !== 'paid' &&
            [
              'cashierId',
              'cashierAmount',
              'externalAmount',
              'externalMethod',
            ].includes(key))))
  );

  // Em contas, "Criado em" e "Liquidada em" rendem juntos; a "Situação"
  // fecha a grade ao lado da "Forma externa" quando ela existir.
  const pairTail =
    endpoint === '/bills'
      ? ['createdAt', 'paidAt', 'status', 'externalMethod']
      : [];
  const readOnlyTail = pairTail
    .map((key) => readOnly.find(([k]) => k === key))
    .filter((entry): entry is [string, unknown] => Boolean(entry));
  const readOnlyMain = readOnly.filter(([k]) => !pairTail.includes(k));

  // Ordem fixa dos cards em contas: quem registrou primeiro, depois o
  // contato e o bloco da liquidação (caixa e valores).
  if (endpoint === '/bills') {
    const order = [
      'createdBy',
      'contactId',
      'cashierId',
      'cashierAmount',
      'externalAmount',
    ];
    readOnlyMain.sort(
      ([a], [b]) =>
        (order.indexOf(a) === -1 ? order.length : order.indexOf(a)) -
        (order.indexOf(b) === -1 ? order.length : order.indexOf(b))
    );
  }

  const fieldCell = 'px-4 py-2.5 text-sm';
  const fieldHead =
    'px-4 py-2 text-left text-xs font-semibold uppercase text-slate-500';

  // Campos ocultos (ex.: documentType) vão no payload mas não viram linha.
  const visibleFields = editableFields.filter((field) => !field.hidden);

  // Partes do endereço exibidas em uma linha consolidada "Endereço" no modo
  // leitura; na edição cada uma continua no seu próprio campo.
  const addressParts = [
    'address.number',
    'address.neighborhood',
    'address.city',
    'address.state',
  ];
  const displayRows = visibleFields
    .filter((field) => !addressParts.includes(field.key))
    .map((field) =>
      field.key === 'address.street'
        ? {
            key: 'address',
            label: 'Endereço',
            text: formatAddress(row.address) || '—',
          }
        : {
            key: field.key,
            label: field.label,
            text: display(
              getValue(row, field.key),
              field.key.split('.').pop()
            ),
          }
    );

  // Input de um campo no modo edição; o documento ganha o botão CPF/CNPJ.
  const renderFieldInput = (field: Field) =>
    field.key === 'document' ? (
      <div className="flex items-stretch gap-2">
        <input
          className="admin-input flex-1"
          type="text"
          value={values[field.key] || ''}
          onChange={(event) =>
            setValues({
              ...values,
              [field.key]: maskDocument(
                event.target.value,
                values.documentType || 'cpf'
              ),
            })
          }
          placeholder={
            values.documentType === 'cnpj'
              ? '00.000.000/0000-00'
              : '000.000.000-00'
          }
        />
        <button
          type="button"
          className="admin-secondary whitespace-nowrap px-3 text-xs"
          onClick={() =>
            setValues({
              ...values,
              documentType: values.documentType === 'cnpj' ? 'cpf' : 'cnpj',
              document: '',
            })
          }
        >
          {values.documentType === 'cnpj' ? 'CNPJ' : 'CPF'}
        </button>
      </div>
    ) : field.options || field.source ? (
      <select
        className="admin-input"
        value={values[field.key] || ''}
        onChange={(event) =>
          setValues({ ...values, [field.key]: event.target.value })
        }
      >
        <option value="">Selecione</option>
        {(
          field.options ||
          (options[field.source || ''] || []).map(
            (option) =>
              [
                String(option._id),
                String(option.name || option._id),
              ] as [string, string]
          )
        ).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    ) : (
      <input
        className="admin-input"
        type={field.type || 'text'}
        min={field.min}
        maxLength={field.maxLength}
        step={field.type === 'number' ? 'any' : undefined}
        value={values[field.key] || ''}
        onChange={(event) =>
          setValues({ ...values, [field.key]: event.target.value })
        }
      />
    );

  return (
    <div>
      <Notice error={error} />
      {/* Campos do sistema (criador, última atualização etc.) no topo. */}
      {readOnlyMain.length > 0 && (
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {readOnlyMain.map(([key, value]) => (
            <div key={key} className={detailBoxClass}>
              <dt className={detailLabelClass}>{detailLabels[key] || key}</dt>
              <dd className={`break-words ${detailValueClass}`}>
                {/* Objetos populados (ex.: criador) exibem só o nome — sem
                    card aninhado dentro do card. */}
                {display(value, key)}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {/* Par fixo no fim da grade (ex.: Liquidada em + Última atualização
          em contas) — sempre lado a lado, independente da quantidade de
          cards acima. */}
      {readOnlyTail.length > 0 && (
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          {readOnlyTail.map(([key, value]) => (
            <div key={key} className={detailBoxClass}>
              <dt className={detailLabelClass}>{detailLabels[key] || key}</dt>
              <dd className={`break-words ${detailValueClass}`}>
                {/* Datas do par final exibem só a data (sufixo @date). */}
                {display(value, /At$/.test(key) ? `${key}@date` : key)}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {/* Campos do registro em formato de lista (Campo | Valor); no modo
          edição cada linha vira o input correspondente, no mesmo lugar. */}
      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr className="divide-x divide-slate-200">
              <th className={fieldHead}>Campo</th>
              <th className={fieldHead}>Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {editing
              ? visibleFields.map((field) => (
                  <tr key={field.key} className="divide-x divide-slate-100">
                    <td className={`${fieldCell} font-medium text-slate-600`}>
                      {field.label}
                    </td>
                    <td className={`${fieldCell} font-medium text-slate-900`}>
                      {field.readOnly
                        ? display(
                            getValue(row, field.key),
                            field.key.split('.').pop()
                          )
                        : renderFieldInput(field)}
                    </td>
                  </tr>
                ))
              : displayRows.map((item) => (
                  <tr key={item.key} className="divide-x divide-slate-100">
                    <td className={`${fieldCell} font-medium text-slate-600`}>
                      {item.label}
                    </td>
                    <td className={`${fieldCell} font-medium text-slate-900`}>
                      {item.text}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
      <div className="mt-5 flex flex-wrap justify-end gap-3">
        {editing ? (
          <>
            <button
              className="admin-secondary"
              disabled={busy}
              onClick={() => setEditing(false)}
            >
              Cancelar
            </button>
            <button
              className="admin-primary"
              disabled={busy}
              onClick={() => void save()}
            >
              {busy ? 'Salvando...' : 'Salvar'}
            </button>
          </>
        ) : (
          <>
            {actions}
            {canEdit && (
              <button className="admin-primary" onClick={startEditing}>
                Editar
              </button>
            )}
          </>
        )}
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
  // Nenhuma tela carrega a listagem na abertura: a busca só acontece
  // sob demanda, quando o usuário clica em Buscar — a menos que já
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
  // A listagem só dispara sozinha quando vem filtro pela URL.
  const [searched, setSearched] = useState(
    Object.keys(initialFilters).length > 0
  );
  // Em contas, o filtro de datas já vem sugerido com os últimos 30 dias
  // (hoje até 30 dias atrás) — facilita listar as contas do último mês.
  // Fica só nos campos visíveis: não dispara busca automática.
  if (screen.endpoint === '/bills' && !initialFilters.startDueDate) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    const iso = (date: Date) => date.toISOString().slice(0, 10);
    initialFilters.startDueDate = iso(start);
    initialFilters.endDueDate = iso(end);
  }
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
  // Funcionário aberto no modal de permissões individuais.
  const [permUser, setPermUser] = useState<Row | null>(null);
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

    // Resumo do caixa aberto: carrega sempre, pois é informação operacional
    // independente da listagem (que fica sob demanda como as demais telas).
    if (isCashiers) {
      try {
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
      } catch (cause) {
        setError(errorMessage(cause));
      }
    }

    // Todas as telas começam com a lista vazia até a primeira busca sob demanda.
    if (!searched) {
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
    } catch (cause) {
      setRows([]);
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [client, tenantId, screen, applied, page, searched, isCashiers, user?.id]);
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
          // Cada linha também ganha a direção (Entrada/Saída) do fluxo.
          if (screen.endpoint === '/cashiers') {
            data = data.map((mov) => {
              // O motivo vem composto ("Estorno da conta: Pagamento fiado"):
              // separa a operação do detalhe para virar duas colunas.
              let operation = display(mov.type, 'type');
              let note = String(mov.reason || '');
              const sep = note.indexOf(':');
              if (sep > 0) {
                operation = note.slice(0, sep);
                note = note.slice(sep + 1).trim();
              } else if (note.startsWith(operation)) {
                note = note.slice(operation.length).trim();
              }
              return {
                ...mov,
                amount:
                  mov.orderId && typeof mov.orderId === 'object'
                    ? ((mov.orderId as Row).amountPaid ??
                      (mov.orderId as Row).total)
                    : mov.amount,
                operation,
                note,
                flow: isCashierInflow(String(mov.type)) ? 'Entrada' : 'Saída',
              };
            });
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
    // Se a ação partiu dos detalhes (ex.: cancelar conta), recarrega o
    // registro para o modal refletir a nova situação sem fechar.
    if (details && details._id === action.row._id && screen.detailKey) {
      try {
        const response = await client.get(
          `${screen.endpoint}/${action.row._id}`
        );
        setDetails(response.data.data[screen.detailKey]);
      } catch {
        setDetails(null);
      }
    }
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
  // Caixas não têm edição de cadastro: só ações operacionais.
  // Visibilidade por permissão: o usuário vê a tela (read) mas os botões
  // de escrita só aparecem se a permissão efetiva permitir — a API segue
  // bloqueando qualquer chamada forçada sem permissão.
  const permRes = PERM_BY_ENDPOINT[screen.endpoint];
  const can = (perm: string | null) =>
    !perm || user?.role === 'master' || hasPermission(user?.permissions, perm);
  const canEdit =
    Boolean(screen.fields) &&
    screen.endpoint !== '/cashiers' &&
    can(permRes ? `${permRes}:write` : null);

  // Abre o formulário de cadastro. Para caixas, busca o valor de fechamento
  // do caixa anterior para preencher o valor inicial travado.
  const openNewRecord = async () => {
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
  };

  return (
    <main className="mx-auto max-w-screen-2xl p-4 sm:p-8">
      <PageHeading title={screen.title} description={screen.description}>
        <div className="flex gap-2">
          {screen.endpoint === '/orders' && can('orders:write') && (
            <Link href="/management/pos" className="admin-primary">
              Nova venda
            </Link>
          )}
          {screen.endpoint === '/products' && (
            <Link href="/management/categories" className="admin-secondary">
              Gerenciar categorias
            </Link>
          )}
          {/* Registro manual de estoque (suprimento/retirada/acerto) a partir
              da tela de produtos — cada tipo exige sua permissão. */}
          {screen.endpoint === '/products' &&
            (hasPermission(user?.permissions, 'stock:supply') ||
              hasPermission(user?.permissions, 'stock:adjust')) && (
              <button
                className="admin-secondary"
                disabled={!tenantId}
                onClick={() =>
                  setAction({
                    row: {},
                    name: 'stockMovement',
                    title: 'Nova movimentação de estoque',
                  })
                }
              >
                Nova movimentação
              </button>
            )}
          {screen.endpoint === '/categories' && (
            <Link href="/management/products" className="admin-secondary">
              Gerenciar estoque
            </Link>
          )}
          {/* Em Funcionários, "Permissões" leva às predefinições —
              mesmo padrão do botão "Gerenciar categorias" em Estoque. */}
          {screen.endpoint === '/users' &&
            can('permissionPresets:read') && (
              <Link href="/management/presets" className="admin-secondary">
                Permissões
              </Link>
            )}
          {screen.endpoint === '/audit' && rows.length > 0 && (
            <button className="admin-secondary" onClick={() => window.print()}>
              Imprimir / PDF
            </button>
          )}
          {/* Em Caixas o "Abrir caixa" mora dentro do card "Caixa do dia"
              (e só aparece quando não há caixa aberto). */}
          {screen.fields && !isCashiers && can(permRes ? `${permRes}:write` : null) && (
            <button
              disabled={!tenantId}
              className="admin-primary"
              onClick={() => void openNewRecord()}
            >
              Novo cadastro
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
            {/* Caixas tem busca própria: o histórico de fechamentos é
                pesquisado pelo painel dedicado abaixo do "Caixa do dia". */}
            {!isCashiers && (screen.search || screen.filters) && (
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
                  // Buscar libera a primeira listagem da tela.
                  setSearched(true);
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
                <button className="admin-primary">Buscar</button>
                <button
                  type="button"
                  className="admin-secondary"
                  onClick={() => {
                    // Limpar volta a tela ao estado inicial: lista fechada,
                    // sem disparar nenhuma busca.
                    setFilters({});
                    setApplied({});
                    setSearched(false);
                    setPage(1);
                  }}
                >
                  Limpar
                </button>
              </form>
            )}
            {/* A contagem e a lista só aparecem após uma busca. Em Caixas,
                o total vai no rodapé da listagem em vez desta linha. */}
            {searched && !isCashiers && (
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
                    {/* Número sequencial do caixa aberto (#6), quando existir. */}
                    {openCashier?.cashierNumber != null &&
                      ` · #${openCashier.cashierNumber}`}
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
                        {can('cashier:write') && (
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
                        )}
                        {/* Regra do backend: só quem abriu o caixa pode fechá-lo,
                            então o botão some quando o caixa é de outro operador. */}
                        {can('cashier:write') &&
                          (typeof openCashier.openedBy === 'object'
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
                    {/* Sem caixa aberto, a abertura acontece aqui no card. */}
                    {!openCashier && can('cashier:write') && (
                      <button
                        className="admin-primary"
                        disabled={!tenantId}
                        onClick={() => void openNewRecord()}
                      >
                        Abrir caixa
                      </button>
                    )}
                    <button
                      className="admin-secondary"
                      onClick={() => setShowCashierHistory(!showCashierHistory)}
                    >
                      {showCashierHistory ? 'Fechar busca' : 'Pesquisar históricos'}
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
            {/* Painel de busca do histórico de caixas fechados: abre pelo
                botão "Pesquisar históricos" no resumo do caixa do dia. */}
            {isCashiers && showCashierHistory && (
              <form
                className="admin-panel flex flex-wrap items-end gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (
                    filters.startDate &&
                    filters.endDate &&
                    filters.startDate > filters.endDate
                  ) {
                    setError('A data inicial não pode ser posterior à final.');
                    return;
                  }
                  setPage(1);
                  setSearched(true);
                  setApplied(filters);
                }}
              >
                <div className="min-w-48 flex-1">
                  <label htmlFor="cashier-search" className="admin-label">
                    Nº do caixa
                  </label>
                  <input
                    id="cashier-search"
                    className="admin-input"
                    value={filters.search || ''}
                    placeholder="Ex.: 4 ou #4"
                    onChange={(event) =>
                      setFilters({ ...filters, search: event.target.value })
                    }
                  />
                </div>
                <div>
                  <label htmlFor="cashier-start" className="admin-label">
                    Data inicial
                  </label>
                  <input
                    id="cashier-start"
                    className="admin-input"
                    type="date"
                    value={filters.startDate || ''}
                    onChange={(event) =>
                      setFilters({ ...filters, startDate: event.target.value })
                    }
                  />
                </div>
                <div>
                  <label htmlFor="cashier-end" className="admin-label">
                    Data final
                  </label>
                  <input
                    id="cashier-end"
                    className="admin-input"
                    type="date"
                    value={filters.endDate || ''}
                    onChange={(event) =>
                      setFilters({ ...filters, endDate: event.target.value })
                    }
                  />
                </div>
                <button className="admin-primary">Buscar</button>
                <button
                  type="button"
                  className="admin-secondary"
                  onClick={() => {
                    setFilters({});
                    setApplied({});
                    setSearched(false);
                    setPage(1);
                  }}
                >
                  Limpar
                </button>
              </form>
            )}
            {(isCashiers &&
              !showCashierHistory &&
              !(filters.search || applied.search || '').trim()) ? null : !searched ? (
              <div className="admin-panel py-12 text-center text-sm text-slate-500">
                Use os filtros acima e clique em Buscar para listar os registros.
              </div>
            ) : loading ? (
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
                    {/* Edição acontece dentro do modal de detalhes — a linha
                        mostra só "Detalhes" e as ações específicas da tela. */}


                    {screen.actions
                      // Primeiro corta o que o usuário não tem permissão
                      // de executar; depois aplicam-se as regras de estado.
                      ?.filter(([name]) =>
                        can(actionPerm(screen.endpoint, name))
                      )
                      .filter(([name]) =>
                        // Vendas: "Cancelar venda" fica dentro dos detalhes —
                        // a linha mostra só "Detalhes".
                        screen.endpoint === '/orders'
                          ? false
                          : screen.endpoint === '/cashiers'
                            ? row.status === 'open' &&
                              (name === 'close' ||
                                display(row.openedBy) === user?.id ||
                                (row.openedBy as Row)?._id === user?.id)
                            // Contas a pagar/receber: ações só dentro dos
                            // detalhes — a linha fica só com "Detalhes".
                            : screen.endpoint === '/bills'
                              ? false
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
              (isCashiers &&
                !showCashierHistory &&
                !(filters.search || applied.search || '').trim()) ||
              !searched
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
            {/* Em Caixas, o total de resultados aparece no fim da listagem. */}
            {isCashiers && searched && !loading && (
              <p className="text-right text-sm text-slate-500">
                {total} registro(s) encontrados
              </p>
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
            <>
              <OrderDetails row={details} />
              {/* Cancelamento fica junto do registro da venda, não na linha
                  da listagem — mesma regra de janela usada no botão antigo. */}
              {details.status === 'paid' &&
                canCancelOrder(details, user?.role) &&
                can('orders:delete') && (
                  <div className="mt-4 flex justify-end">
                    <button
                      className={dangerButtonClass}
                      onClick={() =>
                        setAction({
                          row: details,
                          name: 'cancel',
                          title: 'Cancelar venda',
                        })
                      }
                    >
                      Cancelar venda
                    </button>
                  </div>
                )}
            </>
          ) : screen.endpoint === '/audit' ? (
            <AuditDetails row={details} />
          ) : screen.endpoint === '/cashiers' ? (
            <CashierDetails row={details} />
          ) : screen.fields ? (
            <EditableDetails
              row={details}
              fields={screen.fields}
              endpoint={screen.endpoint}
              detailKey={screen.detailKey}
              // Só conta pendente pode ser editada; liquidada/cancelada
              // vira registro histórico somente leitura.
              canEdit={
                canEdit &&
                (screen.endpoint !== '/bills' || details.status === 'pending')
              }
              actions={
                screen.endpoint === '/products' &&
                details.isActive !== false &&
                hasPermission(user?.permissions, 'stock:supply') ? (
                  <>
                    <button
                      className="admin-secondary"
                      onClick={() =>
                        setAction({
                          row: details,
                          name: 'supply',
                          title: `Suprimento · ${display(details.name)}`,
                        })
                      }
                    >
                      Suprimento
                    </button>
                    <button
                      className="admin-secondary"
                      onClick={() =>
                        setAction({
                          row: details,
                          name: 'withdraw',
                          title: `Retirada · ${display(details.name)}`,
                        })
                      }
                    >
                      Retirada
                    </button>
                  </>
                ) : screen.endpoint === '/users' &&
                  details.role !== 'master' &&
                  ['admin', 'master'].includes(user?.role || '') &&
                  can('users:write') ? (
                  // Gerencia as permissões individuais do funcionário:
                  // preset, extras e revogações.
                  <button
                    className="admin-secondary"
                    onClick={() => setPermUser(details)}
                  >
                    Permissões
                  </button>
                ) : screen.endpoint === '/bills' && can('bills:write') ? (
                  // Conta pendente: baixar ou cancelar. Conta liquidada:
                  // apenas estornar (devolve ao caixa e volta a pendente).
                  <>
                    {details.status === 'pending' && (
                      <>
                        <button
                          className="admin-secondary"
                          onClick={() =>
                            setAction({
                              row: details,
                              name: 'pay',
                              title:
                                screen.actions?.find(([n]) => n === 'pay')?.[1] ||
                                'Registrar baixa',
                            })
                          }
                        >
                          {screen.actions?.find(([n]) => n === 'pay')?.[1] ||
                            'Registrar baixa'}
                        </button>
                        <button
                          className={dangerButtonClass}
                          onClick={() =>
                            setAction({
                              row: details,
                              name: 'cancel',
                              title: 'Cancelar conta',
                            })
                          }
                        >
                          Cancelar conta
                        </button>
                      </>
                    )}
                    {details.status === 'paid' &&
                      canReverseBill(details, user?.role) && (
                        <button
                          className="admin-secondary"
                          onClick={() =>
                            setAction({
                              row: details,
                              name: 'reverse',
                              title: 'Estornar pagamento',
                            })
                          }
                        >
                          Estornar pagamento
                        </button>
                      )}
                  </>
                ) : undefined
              }
              onSaved={(updated) => {
                setDetails(updated);
                setMessage('Registro salvo com sucesso.');
                void load();
              }}
            />
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
                          ['operation', 'Operação'],
                          ['note', 'Motivo'],
                          ['flow', 'Tipo'],
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
      {permUser && (
        <UserPermissionsModal
          user={permUser}
          onClose={() => setPermUser(null)}
          onSaved={async () => {
            setPermUser(null);
            setMessage('Permissões atualizadas com sucesso.');
            await load();
          }}
        />
      )}
      {orderDetails && (
        <Modal
          title={`Venda ${display(orderDetails.orderNumber, 'orderNumber')}`}
          onClose={() => setOrderDetails(null)}
        >
          <OrderDetails row={orderDetails} />
        </Modal>
      )}
      {action && action.name === 'stockMovement' ? (
        <StockMovementModal
          onClose={() => setAction(null)}
          onDone={async () => {
            setAction(null);
            setMessage('Operação concluída com sucesso.');
            await load();
          }}
        />
      ) : action && action.name === 'pay' && screen.endpoint === '/bills' ? (
        <PayBillModal
          bill={action.row}
          onClose={() => setAction(null)}
          onDone={async () => {
            const bill = action.row;
            setAction(null);
            setMessage('Operação concluída com sucesso.');
            // Se a baixa partiu dos detalhes, recarrega a conta para o
            // modal mostrar a nova situação (liquidada em, valores, etc.).
            if (details && details._id === bill._id && screen.detailKey) {
              try {
                const response = await client.get(
                  `${screen.endpoint}/${bill._id}`
                );
                setDetails(response.data.data[screen.detailKey]);
              } catch {
                setDetails(null);
              }
            }
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
                : action.name === 'reverse' && screen.endpoint === '/bills'
                  ? 'O estorno devolve o valor ao caixa de origem e a conta volta para pendente. Só é possível com o caixa ainda aberto. Confirme para continuar.'
                  : action.name === 'delete' && screen.endpoint === '/bills'
                    ? 'A conta pendente será removida da listagem. Confirme para continuar.'
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
    mode === 'cashier'
      ? amount
      : Number(String(cashierAmount).replace(',', '.')) || 0;
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
        <form onSubmit={submit} className="space-y-5">
          <Notice error={error} />
          {/* Resumo da operação: valor da conta e saldo disponível do caixa. */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={detailBoxClass}>
              <p className={detailLabelClass}>Valor da conta</p>
              <p className={detailValueClass}>{display(amount, 'amount')}</p>
            </div>
            <div className={detailBoxClass}>
              <p className={detailLabelClass}>
                Caixa
                {cashier?.cashierNumber != null &&
                  ` #${cashier.cashierNumber}`}{' '}
                · Saldo
              </p>
              <p className={detailValueClass}>
                {cashier ? display(balance, 'balance') : 'Sem caixa aberto'}
              </p>
            </div>
          </div>
          {!cashier && (
            <Notice message="Você não possui caixa aberto. A liquidação será registrada apenas como pagamento externo." />
          )}
          {cashier && insufficient && (
            <Notice
              error={`O saldo atual do caixa (${display(balance, 'balance')}) não é suficiente para liquidar esta conta por completo. Você pode combinar com uma forma externa.`}
            />
          )}
          {/* Opções de liquidação em cards selecionáveis. */}
          <div className="space-y-2">
            {[
              cashier && !insufficient
                ? {
                    value: 'cashier',
                    title: `${isPay ? 'Pagar' : 'Receber'} totalmente pelo caixa`,
                    hint: `Sai ${display(amount, 'amount')} do saldo do caixa`,
                  }
                : null,
              cashier
                ? {
                    value: 'combined',
                    title: 'Combinar caixa + forma externa',
                    hint: 'Parte do caixa e o restante por fora',
                  }
                : null,
              {
                value: 'external',
                title: 'Somente forma externa',
                hint: 'Não movimenta o caixa',
              },
            ]
              .filter(
                (option): option is { value: string; title: string; hint: string } =>
                  Boolean(option)
              )
              .map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                    mode === option.value
                      ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    className="mt-0.5 accent-blue-600"
                    checked={mode === option.value}
                    onChange={() => setMode(option.value as typeof mode)}
                  />
                  <span>
                    <span className="block text-sm font-medium text-slate-900">
                      {option.title}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {option.hint}
                    </span>
                  </span>
                </label>
              ))}
          </div>
          {mode === 'combined' && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <label className="admin-label">
                Valor do caixa (R$)
                {/* inputMode decimal evita as setas nativas do type=number;
                    aceita vírgula ou ponto como separador. */}
                <input
                  className="admin-input mt-1"
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  required
                  value={cashierAmount}
                  onChange={(event) =>
                    setCashierAmount(
                      event.target.value.replace(/[^\d.,]/g, '')
                    )
                  }
                />
              </label>
              <p className="mt-3 flex items-center justify-between text-sm text-slate-600">
                Restante por fora:
                <strong className="text-slate-900">
                  {display(Math.max(0, externalPart), 'amount')}
                </strong>
              </p>
            </div>
          )}
          {(mode === 'combined' && externalPart > 0) || mode === 'external' ? (
            <label className="admin-label">
              Forma de pagamento externa
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

// Modal de nova movimentação de estoque: busca o produto por nome/SKU,
// permite escolher na lista de resultados e registra tipo, quantidade,
// motivo e referência — cada tipo exibe só se o usuário tem a permissão.
function StockMovementModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const { client } = useWorkspaceApi();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Row[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [product, setProduct] = useState<Row | null>(null);
  const [values, setValues] = useState({ type: '', quantity: '', reason: '', reference: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Tipos permitidos conforme as permissões efetivas do usuário.
  const typeOptions = (
    [
      ['in', 'Suprimento (entrada)'],
      ['out', 'Retirada (saída)'],
      ['adjust', 'Ajuste de inventário (saldo final)'],
    ] as [string, string][]
  ).filter(([value]) =>
    hasPermission(user?.permissions, `stock:${value === 'adjust' ? 'adjust' : 'supply'}`)
  );

  const findProducts = async (event: React.FormEvent) => {
    event.preventDefault();
    setSearching(true);
    setError('');
    setSearched(true);
    // Uma nova busca reabre a lista e limpa a seleção anterior.
    setProduct(null);
    try {
      // Busca vazia retorna todos os produtos ativos (o backend não
      // aplica filtro de texto); limitamos a lista do modal a 50 itens.
      const response = await client.get('/products', {
        params: { search: search.trim(), limit: 50 },
      });
      setResults(response.data.data.data as Row[]);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSearching(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      if (!product) throw new Error('Selecione um produto na lista.');
      if (!values.type) throw new Error('Selecione o tipo de movimentação.');
      const quantity = Number(values.quantity);
      if (!Number.isFinite(quantity) || quantity < 0)
        throw new Error('Informe uma quantidade válida.');
      if (values.type !== 'adjust' && quantity === 0)
        throw new Error('A quantidade deve ser maior que zero.');
      if (values.type === 'out' && quantity > Number(product.quantityInStock))
        throw new Error('Estoque insuficiente para a retirada.');
      if (!values.reason.trim()) throw new Error('Informe o motivo.');
      setBusy(true);
      await client.post('/stock/movements', {
        productId: product._id,
        type: values.type,
        quantity,
        reason: values.reason.trim(),
        reference: values.reference.trim(),
      });
      await onDone();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Nova movimentação de estoque" onClose={onClose}>
      <div className="space-y-5">
        <Notice error={error} />
        <form className="flex items-end gap-3" onSubmit={findProducts}>
          <div className="flex-1">
            <label htmlFor="movement-product" className="admin-label">
              Produto
            </label>
            <input
              id="movement-product"
              className="admin-input"
              placeholder="Nome ou SKU do produto"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <button className="admin-primary" disabled={searching}>
            {searching ? 'Buscando...' : 'Buscar'}
          </button>
        </form>

        {product && (
          <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
            Selecionado: <strong>{display(product.name)}</strong>
            {' · '}Estoque atual: {String(product.quantityInStock)}
          </p>
        )}

        {/* A lista de resultados fecha ao selecionar um produto. */}
        {searched && !searching && !product && (
          results.length ? (
            <ul className="max-h-48 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
              {results.map((item) => (
                <li key={String(item._id)}>
                  <button
                    type="button"
                    onClick={() => setProduct(item)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition hover:bg-slate-50"
                  >
                    <span className="font-medium text-slate-800">
                      {display(item.name)}
                      <span className="ml-2 text-xs text-slate-400">
                        {display(item.sku, 'sku')}
                      </span>
                    </span>
                    <span className="text-xs text-slate-500">
                      Estoque: {String(item.quantityInStock)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Nenhum produto encontrado.</p>
          )
        )}

        <form className="space-y-4" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="admin-label">
              Movimentação *
              <select
                className="admin-input mt-1"
                value={values.type}
                onChange={(event) => setValues({ ...values, type: event.target.value })}
                required
              >
                <option value="">Selecione</option>
                {typeOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-label">
              Quantidade *
              <input
                className="admin-input mt-1"
                type="number"
                min={values.type === 'adjust' ? 0 : 0.01}
                step="any"
                value={values.quantity}
                onChange={(event) => setValues({ ...values, quantity: event.target.value })}
                required
              />
            </label>
            <label className="admin-label">
              Motivo *
              <input
                className="admin-input mt-1"
                value={values.reason}
                onChange={(event) => setValues({ ...values, reason: event.target.value })}
                required
              />
            </label>
            <label className="admin-label">
              Referência
              <input
                className="admin-input mt-1"
                value={values.reference}
                onChange={(event) => setValues({ ...values, reference: event.target.value })}
              />
            </label>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" className="admin-secondary" onClick={onClose} disabled={busy}>
              Voltar
            </button>
            <button className="admin-primary" disabled={busy}>
              {busy ? 'Registrando...' : 'Confirmar movimentação'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

// Modal de permissões individuais do funcionário: carrega os presets do
// tenant e o catálogo, e reaproveita o editor completo (preset + extras +
// revogações) dentro de um modal.
function UserPermissionsModal({
  user: target,
  onClose,
  onSaved,
}: {
  user: Row;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { client, tenantId } = useWorkspaceApi();
  const [presets, setPresets] = useState<PermissionPreset[]>([]);
  const [catalog, setCatalog] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [presetRows, catalogRes] = await Promise.all([
          loadOptions(client, '/permission-presets'),
          client.get('/permission-presets/available-permissions'),
        ]);
        if (!active) return;
        // Presets globais (sem tenant) valem para todas as empresas.
        setPresets(
          (presetRows as unknown as PermissionPreset[]).filter(
            (preset) => !preset.tenantId || preset.tenantId === tenantId
          )
        );
        setCatalog(catalogRes.data.data.permissions);
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
  }, [client, tenantId]);

  return (
    <Modal title={`Permissões · ${display(target.name)}`} onClose={onClose}>
      {loading ? (
        <p role="status" className="text-sm text-slate-500">
          Carregando permissões...
        </p>
      ) : error ? (
        <Notice error={error} />
      ) : (
        <UserPermissionsEditor
          key={String(target._id)}
          user={target as unknown as PanelUser}
          presets={presets}
          catalog={catalog}
          onSaved={onSaved}
        />
      )}
    </Modal>
  );
}
