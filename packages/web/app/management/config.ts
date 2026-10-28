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
  // Campo somente leitura nos detalhes (não entra no formulário de cadastro).
  readOnly?: boolean;
  // Campo que só aparece na edição, nunca no cadastro (ex.: situação —
  // não faz sentido criar um registro já inativo).
  editOnly?: boolean;
  // Valor controlado por outro campo: existe no payload mas não vira input.
  hidden?: boolean;
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
  // Só na edição: criar um registro já inativo não faz sentido.
  editOnly: true,
  options: [
    ['true', 'Ativo'],
    ['false', 'Inativo'],
  ],
};
const contactFields: Field[] = [
  { key: 'name', label: 'Nome', required: true },
  // O tipo não vira uma linha própria: um botão no input de documento
  // alterna CPF/CNPJ, mas o valor continua sendo enviado ao backend.
  {
    key: 'documentType',
    label: 'Tipo de documento',
    required: true,
    hidden: true,
    options: [
      ['cpf', 'CPF'],
      ['cnpj', 'CNPJ'],
    ],
  },
  { key: 'document', label: 'Documento', required: true },
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

// Clientes: mesma lista sem a coluna de situação (o status fica no filtro).
const customerColumns: [string, string][] = contactColumns.filter(
  ([key]) => key !== 'isActive'
);

// Filtro de busca compartilhado: vazio = Ativos (padrão do backend).
const activeViewFilter: Field = {
  key: 'view',
  label: 'Filtros de busca',
  emptyLabel: 'Ativos',
  options: [
    ['inactive', 'Inativos'],
    ['all', 'Todos'],
  ],
};
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
  // "@date" exibe só a data do vencimento, sem a hora.
  ['dueDate@date', 'Vencimento'],
  ['status', 'Situação'],
];
const billFilters: Field[] = [
  {
    key: 'status',
    label: 'Situação',
    options: [
      ['pending', 'Pendente'],
      ['paid', 'Finalizada'],
      ['cancelled', 'Cancelada'],
    ],
  },
  { key: 'startDueDate', label: 'Data inicial', type: 'date' },
  { key: 'endDueDate', label: 'Data final', type: 'date' },
];

export const screens: Record<string, Screen> = {
  products: {
    title: 'Estoque',
    description:
      'Organize o catálogo, os preços e as informações dos seus produtos.',
    endpoint: '/products',
    search: true,
    detailKey: 'product',
    columns: [
      ['name', 'Produto'],
      ['costPrice', 'Custo'],
      ['price', 'Preço'],
      ['quantityInStock', 'Estoque'],
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
      {
        key: 'categoryId',
        label: 'Categoria',
        source: '/categories',
        required: true,
      },
      { key: 'sku', label: 'SKU', required: true },
      {
        key: 'unit',
        label: 'Unidade',
        required: true,
        options: ['un', 'kg', 'g', 'lt', 'ml', 'm', 'cm', 'par', 'cx'].map(
          (unit) => [unit, unit]
        ),
      },
      active,
      {
        key: 'costPrice',
        label: 'Custo (R$)',
        type: 'number',
        min: 0,
      },
      {
        key: 'price',
        label: 'Preço de venda (R$)',
        type: 'number',
        min: 0,
        required: true,
      },
      { key: 'quantityInStock', label: 'Estoque atual', readOnly: true },
      { key: 'minStock', label: 'Estoque mínimo', type: 'number', min: 0 },
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
    ],
    filters: [activeViewFilter],
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
    columns: customerColumns,
    fields: contactFields,
    filters: [activeViewFilter],
  },
  suppliers: {
    title: 'Fornecedores',
    description: 'Mantenha os contatos e dados dos parceiros da empresa.',
    endpoint: '/suppliers',
    search: true,
    detailKey: 'supplier',
    columns: customerColumns,
    filters: [activeViewFilter],
    fields: [
      ...contactFields,
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
    ],
    filters: [activeViewFilter],
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
      ['cashierNumber', 'Caixa'],
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
    // Conta a pagar pode vincular um fornecedor (opcional).
    fields: [
      billFields[0],
      { key: 'contactId', label: 'Fornecedor', source: '/suppliers' },
      ...billFields.slice(1),
    ],
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
    // Conta a receber pode vincular um cliente (opcional).
    fields: [
      billFields[0],
      { key: 'contactId', label: 'Cliente', source: '/customers' },
      ...billFields.slice(1),
    ],
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
  pay: 'A pagar',
  receive: 'A receber',
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

const digits = (value: unknown) => String(value ?? '').replace(/\D/g, '');

// Formata CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00) conforme os dígitos.
export function formatDocument(value: unknown): string {
  const d = digits(value);
  if (d.length === 11)
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  if (d.length === 14)
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  return String(value ?? '');
}

// Formata CEP como 00000-000.
export function formatCep(value: unknown): string {
  const d = digits(value);
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : String(value ?? '');
}

// Formata telefone como (00) 0000-0000 ou (00) 00000-0000.
export function formatPhone(value: unknown): string {
  const d = digits(value);
  if (d.length === 11)
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return String(value ?? '');
}

// Aplica a máscara do tipo de documento enquanto o usuário digita.
export function maskDocument(value: unknown, type = 'cpf'): string {
  const d = digits(value).slice(0, type === 'cnpj' ? 14 : 11);
  if (type === 'cpf') {
    return d
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

// Monta o endereço em uma linha: "Rua, número, bairro, cidade/UF".
export function formatAddress(address: unknown): string {
  const a = (address || {}) as Row;
  return [
    a.street,
    a.number,
    a.neighborhood,
    a.city && a.state ? `${a.city}/${a.state}` : a.city || a.state,
  ]
    .filter(Boolean)
    .join(', ');
}

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
      row.name ||
        row.displayName ||
        row.description ||
        // Caixas populados exibem o número sequencial (#3); caixas antigos
        // sem número mostram a data de abertura em vez do _id.
        (row.cashierNumber != null ? `#${row.cashierNumber}` : null) ||
        (row.openedAt
          ? `Caixa de ${new Date(String(row.openedAt)).toLocaleDateString('pt-BR')}`
          : null) ||
        row._id ||
        '—'
    );
  }
  if (key === 'orderNumber' || key === 'cashierNumber')
    return `#${String(value)}`;
  // Documentos, CEP e telefone sempre exibidos formatados.
  if (['document', 'cpf'].includes(key)) return formatDocument(value);
  if (key === 'zipCode') return formatCep(value);
  if (key === 'phone') return formatPhone(value);
  // Parcelas: 1x vira "À vista", demais exibem "Nx".
  if (key === 'installments')
    return Number(value) > 1 ? `${value}x` : 'À vista';
  // Colunas com sufixo "@date" exibem somente a data; os detalhes
  // continuam mostrando data e hora completas.
  if (key.endsWith('@date'))
    return new Date(String(value)).toLocaleDateString('pt-BR');
  // Vencimento é uma data pura: nunca exibe hora, nem nos detalhes.
  if (key === 'dueDate')
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
