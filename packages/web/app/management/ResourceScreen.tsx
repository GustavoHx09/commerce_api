'use client';

import { startTransition, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useWorkspaceApi } from '../AdminShell';
import { useAuth } from '../context/AuthContext';
import UserPermissionsEditor from '../permissions/components/UserPermissionsEditor';
import type { PanelUser, PermissionPreset } from '../permissions/types';
import { hasPermission } from '@/lib/permissions';
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

const hiddenFields = new Set([
  '_id',
  'password',
  'passwordChangedAt',
  'tenantId',
  '__v',
  'deletedAt',
  'permissionPresetId',
  // Campo legado presente em contas criadas pelo seed antigo — fora do schema.
  'supplierId',
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
      if (field.required && !raw) {
        setError(`Preencha ${field.label}.`);
        return;
      }
      if (
        raw &&
        field.type === 'number' &&
        (!Number.isFinite(Number(raw)) || Number(raw) < (field.min ?? -Infinity))
      ) {
        setError(`Valor inválido para ${field.label}.`);
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
      // "Criado em" é redundante com "Última atualização"; descrição foi
      // removida do formulário de produtos e não aparece nos detalhes.
      key !== 'createdAt' &&
      key !== 'description' &&
      // Em contas, "Tipo" (a pagar/a receber) já é a própria tela e "Ativo"
      // não agrega — soft delete nunca chega visível aqui. Dados da
      // liquidação (caixa, valores, meio externo) só aparecem depois de paga.
      !(endpoint === '/bills' &&
        (key === 'type' ||
          key === 'isActive' ||
          (row.status !== 'paid' &&
            [
              'cashierId',
              'cashierAmount',
              'externalAmount',
              'externalMethod',
            ].includes(key))))
  );

  // Em contas, "Liquidada em" e "Última atualização" rendem juntos e a
  // "Situação" fecha a grade — sempre lado a lado e nessa ordem.
  const pairTail =
    endpoint === '/bills' ? ['paidAt', 'updatedAt', 'status'] : [];
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
      'externalMethod',
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
                {display(value, key)}
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
  }, [client, tenantId, screen, applied, page, isProducts, productsSearched, isCashiers, user?.id]);
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
  const canEdit = Boolean(screen.fields) && screen.endpoint !== '/cashiers';

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
            ['admin', 'master'].includes(user?.role || '') && (
              <Link href="/management/presets" className="admin-secondary">
                Permissões
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
                <button className="admin-primary">Buscar</button>
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
                    {/* Edição acontece dentro do modal de detalhes — a linha
                        mostra só "Detalhes" e as ações específicas da tela. */}


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
                  ['admin', 'master'].includes(user?.role || '') ? (
                  // Gerencia as permissões individuais do funcionário:
                  // preset, extras e revogações.
                  <button
                    className="admin-secondary"
                    onClick={() => setPermUser(details)}
                  >
                    Permissões
                  </button>
                ) : screen.endpoint === '/bills' ? (
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
