export type Row = Record<string, unknown>;
export type Field = {
  key: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: [string, string][];
  source?: string;
  min?: number;
  maxLength?: number;
  createOnly?: boolean;
  disabled?: boolean;
  hint?: string;
  // Rótulo do item vazio nos filtros (quando omitido, exibe "Todos").
  emptyLabel?: string;
};
export type Screen = {
  title: string;
  description: string;
  endpoint: string;
  columns: [string, string][];
  fields?: Field[];
  search?: boolean;
  filters?: Field[];
  params?: Record<string, string>;
  actions?: [string, string][];
  detailKey?: string;
};

export const addressFields: Field[] = [
  ['street', 'Rua'],
  ['number', 'Número'],
  ['complement', 'Complemento'],
  ['neighborhood', 'Bairro'],
  ['city', 'Cidade'],
  ['state', 'Estado'],
  ['zipCode', 'CEP'],
].map(([key, label]) => ({ key: `address.${key}`, label }));
const active: Field = {
  key: 'isActive',
  label: 'Situação',
  options: [
    ['true', 'Ativo'],
    ['false', 'Inativo'],
  ],
};
const contactFields: Field[] = [
  { key: 'name', label: 'Nome', required: true },
  {
    key: 'documentType',
    label: 'Tipo de documento',
    required: true,
    options: [
      ['cpf', 'CPF'],
      ['cnpj', 'CNPJ'],
    ],
  },
  { key: 'document', label: 'CPF/CNPJ', required: true },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Telefone' },
  ...addressFields,
  active,
];
const contactColumns: [string, string][] = [
  ['name', 'Nome'],
  ['document', 'Documento'],
  ['email', 'Email'],
  ['phone', 'Telefone'],
  ['isActive', 'Situação'],
];
const billFields: Field[] = [
  { key: 'description', label: 'Descrição', required: true },
  {
    key: 'amount',
    label: 'Valor (R$)',
    type: 'number',
    min: 0.01,
    required: true,
  },
  { key: 'dueDate', label: 'Vencimento', type: 'date', required: true },
  { key: 'notes', label: 'Observações' },
];
const billColumns: [string, string][] = [
  ['description', 'Descrição'],
  ['amount', 'Valor'],
  ['dueDate', 'Vencimento'],
  ['status', 'Situação'],
];
const billFilters: Field[] = [
  {
    key: 'status',
    label: 'Situação',
    options: [
      ['pending', 'Pendente'],
      ['paid', 'Liquidada'],
      ['cancelled', 'Cancelada'],
    ],
  },
  { key: 'startDueDate', label: 'Vencimento inicial', type: 'date' },
  { key: 'endDueDate', label: 'Vencimento final', type: 'date' },
];

export const screens: Record<string, Screen> = {
  products: {
    title: 'Produtos',
    description:
      'Organize o catálogo, os preços e as informações dos seus produtos.',
    endpoint: '/products',
    search: true,
    detailKey: 'product',
    columns: [
      ['name', 'Produto'],
      ['price', 'Preço'],
      ['quantityInStock', 'Estoque'],
      ['isActive', 'Situação'],
    ],
    filters: [
      {
        key: 'view',
        label: 'Filtros de busca',
        // Vazio equivale a "Ativos" (padrão do backend).
        emptyLabel: 'Ativos',
        options: [
          ['inactive', 'Inativos'],
          ['lowStock', 'Estoque baixo'],
          ['all', 'Todos'],
        ],
      },
    ],
    fields: [
      { key: 'name', label: 'Nome', required: true },
      { key: 'sku', label: 'SKU', required: true },
      { key: 'description', label: 'Descrição' },
      {
        key: 'categoryId',
        label: 'Categoria',
        source: '/categories',
        required: true,
      },
      {
        key: 'unit',
        label: 'Unidade',
        required: true,
        options: ['un', 'kg', 'g', 'lt', 'ml', 'm', 'cm', 'par', 'cx'].map(
          (unit) => [unit, unit]
        ),
      },
      {
        key: 'price',
        label: 'Preço de venda (R$)',
        type: 'number',
        min: 0,
        required: true,
      },
      {
        key: 'costPrice',
        label: 'Preço de custo (R$)',
        type: 'number',
        min: 0,
      },
      { key: 'minStock', label: 'Estoque mínimo', type: 'number', min: 0 },
      active,
    ],
  },
  categories: {
    title: 'Categorias',
    description: 'Agrupe produtos para facilitar a organização do catálogo.',
    endpoint: '/categories',
    search: true,
    detailKey: 'category',
    columns: [
      ['name', 'Nome'],
      ['description', 'Descrição'],
      ['isActive', 'Situação'],
    ],
    fields: [
      { key: 'name', label: 'Nome', required: true },
      { key: 'description', label: 'Descrição' },
      active,
    ],
  },
  customers: {
    title: 'Clientes',
    description:
      'Cadastre seus clientes e consulte suas informações comerciais.',
    endpoint: '/customers',
    search: true,
    detailKey: 'customer',
    columns: contactColumns,
    fields: contactFields,
  },
  suppliers: {
    title: 'Fornecedores',
    description: 'Mantenha os contatos e dados dos parceiros da empresa.',
    endpoint: '/suppliers',
    search: true,
    detailKey: 'supplier',
    columns: contactColumns,
    fields: [
      ...contactFields,
      { key: 'contactName', label: 'Nome do contato' },
      { key: 'observations', label: 'Observações', maxLength: 500 },
    ],
  },
  users: {
    title: 'Funcionários',
    description:
      'Gerencie os usuários que trabalham na sua empresa. Autorizações ficam em Equipe e permissões.',
    endpoint: '/users',
    search: true,
    detailKey: 'user',
    columns: [
      ['name', 'Nome'],
      ['email', 'Email'],
      ['role', 'Perfil'],
      ['phone', 'Telefone'],
      ['isActive', 'Situação'],
    ],
    fields: [
      { key: 'name', label: 'Nome', required: true },
      { key: 'email', label: 'Email', type: 'email', required: true },
      { key: 'cpf', label: 'CPF', required: true },
      { key: 'phone', label: 'Telefone', required: true },
      {
        key: 'password',
        label: 'Senha inicial',
        type: 'password',
        required: true,
        createOnly: true,
      },
      {
        key: 'role',
        label: 'Perfil',
        required: true,
        options: [
          ['user', 'Funcionário'],
          ['admin', 'Administrador'],
        ],
      },
      ...addressFields,
      active,
    ],
  },
  movements: {
    title: 'Movimentações e inventário',
    description:
      'Entradas e saídas alteram o saldo; o ajuste de inventário define a quantidade final contada.',
    endpoint: '/stock/movements',
    search: true,
    detailKey: 'movement',
    columns: [
      ['productId', 'Produto'],
      ['type', 'Tipo'],
      ['quantity', 'Quantidade'],
      ['previousQuantity', 'Anterior'],
      ['newQuantity', 'Novo saldo'],
      ['reason', 'Motivo'],
      ['createdAt', 'Data'],
    ],
    fields: [
      {
        key: 'productId',
        label: 'Produto',
        source: '/products',
        required: true,
      },
      {
        key: 'type',
        label: 'Movimentação',
        required: true,
        options: [
          ['in', 'Entrada'],
          ['out', 'Saída'],
          ['adjust', 'Ajuste de inventário (saldo final)'],
        ],
      },
      {
        key: 'quantity',
        label: 'Quantidade',
        type: 'number',
        min: 0,
        required: true,
      },
      { key: 'reason', label: 'Motivo' },
      { key: 'reference', label: 'Referência' },
    ],
    filters: [
      {
        key: 'type',
        label: 'Tipo',
        options: [
          ['in', 'Entrada'],
          ['out', 'Saída'],
          ['adjust', 'Ajuste'],
        ],
      },
    ],
  },
  orders: {
    title: 'Vendas e pedidos',
    description: 'Acompanhe vendas realizadas no PDV, seus itens e pagamentos.',
    endpoint: '/orders',
    search: true,
    detailKey: 'order',
    columns: [
      ['createdAt@date', 'Data'],
      ['createdBy', 'Operador'],
      ['customerId', 'Cliente'],
      ['total', 'Total'],
      ['status', 'Situação'],
      ['orderNumber', 'Venda'],
    ],
    filters: [
      {
        key: 'status',
        label: 'Situação',
        options: [
          ['paid', 'Finalizada'],
          ['canceled', 'Cancelada'],
        ],
      },
      { key: 'operator', label: 'Operador' },
    ],
    actions: [['cancel', 'Cancelar venda']],
  },
  cashiers: {
    title: 'Caixas',
    description:
      'Abra seu caixa, registre sangrias e reforços e consulte os fechamentos.',
    endpoint: '/cashiers',
    detailKey: 'cashier',
    columns: [
      ['openedAt', 'Abertura'],
      ['openedBy', 'Responsável'],
      ['initialAmount', 'Valor inicial'],
      ['balance', 'Saldo atual'],
      ['finalAmount', 'Valor de fechamento'],
      ['status', 'Situação'],
    ],
    fields: [
      {
        key: 'initialAmount',
        label: 'Valor inicial (R$)',
        type: 'number',
        min: 0,
        required: true,
      },
    ],
    actions: [
      ['movement', 'Sangria / reforço'],
      ['close', 'Fechar caixa'],
    ],
  },
  payables: {
    title: 'Contas a pagar',
    description: 'Controle despesas, vencimentos e pagamentos da empresa.',
    endpoint: '/bills',
    detailKey: 'bill',
    params: { type: 'pay' },
    columns: billColumns,
    fields: billFields,
    filters: billFilters,
    actions: [
      ['pay', 'Registrar pagamento'],
      ['cancel', 'Cancelar conta'],
    ],
  },
  receivables: {
    title: 'Contas a receber',
    description: 'Acompanhe recebimentos pendentes e valores já recebidos.',
    endpoint: '/bills',
    detailKey: 'bill',
    params: { type: 'receive' },
    columns: billColumns,
    fields: billFields,
    filters: billFilters,
    actions: [
      ['pay', 'Registrar recebimento'],
      ['cancel', 'Cancelar conta'],
    ],
  },
  audit: {
    title: 'Auditoria',
    description: 'Consulte quem realizou cada operação e os dados alterados.',
    endpoint: '/audit',
    columns: [
      ['createdAt', 'Data'],
      ['entityType', 'Entidade'],
      ['action', 'Operação'],
      ['actorId', 'Responsável'],
      ['entityName', 'Registro'],
    ],
    filters: [
      { key: 'entityType', label: 'Entidade' },
      {
        key: 'action',
        label: 'Operação',
        options: [
          ['create', 'Criação'],
          ['update', 'Alteração'],
          ['delete', 'Exclusão'],
          ['restore', 'Restauração'],
        ],
      },
    ],
  },
};

export const labels: Record<string, string> = {
  paid: 'Finalizada',
  pending: 'Pendente',
  cancelled: 'Cancelada',
  canceled: 'Cancelada',
  open: 'Aberto',
  closed: 'Fechado',
  in: 'Entrada',
  out: 'Saída',
  adjust: 'Acerto de estoque',
  user: 'Funcionário',
  admin: 'Administrador',
  master: 'MASTER',
  create: 'Criação',
  update: 'Alteração',
  delete: 'Exclusão',
  restore: 'Restauração',
  cash: 'Dinheiro',
  pix: 'Pix',
  credit_card: 'Cartão de crédito',
  debit_card: 'Cartão de débito',
  other: 'Outro',
  suprimento: 'Reforço',
  sangria: 'Sangria',
  venda: 'Venda',
  estorno: 'Estorno de venda',
  pagamento_conta: 'Pagamento de conta',
  recebimento_conta: 'Recebimento de conta',
  // Entidades da auditoria em português.
  tenant: 'Empresa',
  permissionPreset: 'Preset de permissões',
  product: 'Produto',
  category: 'Categoria',
  customer: 'Cliente',
  supplier: 'Fornecedor',
  bill: 'Conta',
  order: 'Venda',
  orderItem: 'Item da venda',
  cashier: 'Caixa',
  cashierMovement: 'Movimentação de caixa',
  payment: 'Pagamento',
  stock: 'Estoque',
  stockMovement: 'Movimentação de estoque',
  audit: 'Auditoria',
};

export function getValue(row: Row, key: string): unknown {
  // O sufixo "@date" marca a coluna para exibir só a data (sem hora) —
  // o valor buscado continua sendo o campo antes do sufixo.
  return key
    .split('@')[0]
    .split('.')
    .reduce<unknown>(
      (value, part) =>
        value && typeof value === 'object' ? (value as Row)[part] : undefined,
      row
    );
}

export function display(value: unknown, key = ''): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Ativo' : 'Inativo';
  if (Array.isArray(value))
    return value.map((item) => display(item)).join(', ');
  if (typeof value === 'object') {
    const row = value as Row;
    return String(
      row.name || row.displayName || row.description || row._id || '—'
    );
  }
  if (key === 'orderNumber') return `#${String(value)}`;
  // Parcelas: 1x vira "À vista", demais exibem "Nx".
  if (key === 'installments')
    return Number(value) > 1 ? `${value}x` : 'À vista';
  // Colunas com sufixo "@date" exibem somente a data; os detalhes
  // continuam mostrando data e hora completas.
  if (key.endsWith('@date'))
    return new Date(String(value)).toLocaleDateString('pt-BR');
  if (/At$|Date$/.test(key) || ['start', 'end'].includes(key))
    return new Date(String(value)).toLocaleString('pt-BR');
  if (
    [
      'price',
      'costPrice',
      'revenue',
      'unitPrice',
      'total',
      'amount',
      'initialAmount',
      'finalAmount',
      'amountPaid',
      'change',
      'discount',
      'inflow',
      'outflow',
      'balance',
      'sales',
      'cashSales',
      'estornos',
      'cashierAmount',
      'externalAmount',
      'interestAmount',
      'billsReceive',
      'billsPay',
      'suprimentos',
      'sangrias',
      'totalRevenue',
      'averageTicket',
      'totalCostValue',
      'totalSaleValue',
    ].includes(key)
  )
    return Number(value).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  return labels[String(value)] || String(value);
}
