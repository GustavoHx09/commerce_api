'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useWorkspaceApi } from '../AdminShell';
import { useAuth } from '../context/AuthContext';
import { display, labels, screens, type Row } from './config';
import {
  errorMessage,
  loadOptions,
  Modal,
  Notice,
  PageHeading,
  RecordForm,
} from './ui';

type CartItem = { product: Row; quantity: number; discount: number };

// Linha de pagamento combinado. Em "amount" vai o valor informado:
// para dinheiro é o valor entregue; para os demais é a parte da venda coberta
// por aquele método (o juros do crédito é calculado sobre a parcela).
type PaymentLine = {
  method: string;
  amount: string;
  installments: number;
  cardSaleId: string;
  authorizationCode: string;
  // Só subtrai do "falta pagar" depois que a linha é confirmada.
  confirmed?: boolean;
};

const PAYMENT_METHODS: [string, string][] = [
  ['pix', 'Pix'],
  ['cash', 'Dinheiro'],
  ['credit_card', 'Cartão de crédito'],
  ['debit_card', 'Cartão de débito'],
  ['other', 'Outro'],
];

const round2 = (value: number) => Math.round(value * 100) / 100;
const currency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function PosScreen() {
  const { client, tenantId } = useWorkspaceApi();
  const { user, tenant } = useAuth();
  const [products, setProducts] = useState<Row[]>([]);
  const [cashierId, setCashierId] = useState('');
  // Cliente selecionado + busca sob demanda (não carrega a lista completa).
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerResults, setCustomerResults] = useState<Row[]>([]);
  const [customerModal, setCustomerModal] = useState(false);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  // Item do carrinho com edição expandida (quantidade/desconto); por padrão
  // as linhas ficam compactas, mostrando só nome, resumo e ações.
  const [editingItem, setEditingItem] = useState<string | null>(null);
  // Resultados da busca de produtos exibidos inline na etapa de seleção.
  const [searched, setSearched] = useState(false);
  // Etapa do PDV: seleção de produtos -> fechamento da venda (venda atual).
  const [step, setStep] = useState<'items' | 'checkout'>('items');
  // Modal de aviso exibido ao tentar fechar a venda sem caixa aberto.
  const [cashierNotice, setCashierNotice] = useState(false);
  // Linhas de pagamento confirmadas com detalhes expandidos (parcelas/cartão).
  const [expandedPayments, setExpandedPayments] = useState<
    Record<number, boolean>
  >({});
  const [discount, setDiscount] = useState(0);
  const [payments, setPayments] = useState<PaymentLine[]>([
    { method: 'pix', amount: '', installments: 1, cardSaleId: '', authorizationCode: '' },
  ]);
  const [observations, setObservations] = useState('');
  const [creditTable, setCreditTable] = useState<Row[]>([]);
  const [error, setError] = useState('');
  // Erro de valor excedente exibido logo abaixo dos cards de pagamento.
  const [paymentError, setPaymentError] = useState('');
  const [finishedOrder, setFinishedOrder] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const [cashiers, company] = await Promise.all([
          loadOptions(client, '/cashiers'),
          client.get('/tenants/me'),
        ]);
        if (!active) return;
        const fees = (company.data.data.tenant?.paymentFees?.creditInstallments ||
          []) as Row[];
        setCreditTable(fees);
        // No modo compartilhado vale o caixa aberto da empresa; no modo por
        // operador apenas o caixa aberto pelo próprio usuário logado.
        const shared = company.data.data.tenant?.cashierMode === 'shared';
        const current = cashiers.find(
          (cashier) =>
            cashier.status === 'open' &&
            (shared ||
              (typeof cashier.openedBy === 'object'
                ? (cashier.openedBy as Row)?._id
                : cashier.openedBy) === user?.id)
        );
        setCashierId(current ? String(current._id) : '');
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
  }, [client, tenantId, user?.id]);

  // Busca produtos por nome, SKU ou categoria somente ao confirmar a busca
  // (botão ou Enter). Em branco, traz todos os produtos ativos.
  const searchProducts = async () => {
    if (!tenantId) return;
    const term = search.trim();
    setSearched(true);
    try {
      const response = await client.get('/products', {
        params: {
          ...(term ? { search: term } : {}),
          isActive: 'true',
          limit: term ? 12 : 50,
        },
      });
      setProducts(
        ((response.data.data.data || []) as Row[]).filter(
          (product) => product.isActive !== false
        )
      );
    } catch {
      setProducts([]);
    }
  };

  // Busca clientes sob demanda conforme o operador digita (nome, CPF/CNPJ, telefone).
  useEffect(() => {
    const term = customerQuery.trim();
    // Busca e limpeza de resultados rodam dentro do debounce para não
    // chamar setState de forma síncrona no corpo do effect.
    const timer = setTimeout(async () => {
      if (!tenantId || !term) {
        setCustomerResults([]);
        return;
      }
      try {
        const response = await client.get('/customers', {
          params: { search: term, isActive: 'true', limit: 8 },
        });
        setCustomerResults(response.data.data.data || []);
      } catch {
        setCustomerResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [client, tenantId, customerQuery]);

  // Cria um cliente direto do PDV (mesmo formulário da tela de clientes)
  // e já o seleciona na venda.
  const createCustomer = async (payload: Row) => {
    const response = await client.post('/customers', payload);
    const created = response.data.data.customer;
    setCustomerId(String(created._id));
    setCustomerName(String(created.name));
    setCustomerModal(false);
    setCustomerQuery('');
  };

  const subtotal = cart.reduce(
    (sum, item) =>
      sum + Number(item.product.price) * item.quantity - item.discount,
    0
  );
  const total = Math.round((subtotal - discount) * 100) / 100;

  // Percentual de juros configurado no tenant para a quantidade de parcelas.
  const interestFor = (installments: number) =>
    Number(
      creditTable.find((entry) => Number(entry.installments) === installments)
        ?.interestPercent ?? 0
    );

  // Remove uma linha de pagamento garantindo que sempre exista uma linha
  // editável para cobrir o valor restante.
  const removePayment = (index: number) => {
    setPaymentError('');
    setPayments((previous) => {
      const next = previous.filter((_, lineIndex) => lineIndex !== index);
      if (!next.some((line) => !line.confirmed)) {
        next.push({
          method: 'pix',
          amount: '',
          installments: 1,
          cardSaleId: '',
          authorizationCode: '',
        });
      }
      return next;
    });
  };

  const updatePayment = (index: number, patch: Partial<PaymentLine>) =>
    setPayments((previous) =>
      previous.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...patch } : line
      )
    );

  // Confirma uma linha de pagamento: bloqueia quando o total já foi coberto e
  // impede que métodos não-dinheiro excedam o restante (juros do crédito soma
  // por fora; dinheiro pode exceder virando troco).
  const confirmPayment = (index: number) => {
    const line = payments[index];
    const amount = Number(line.amount) || 0;
    if (amount <= 0) return;
    if (missing <= 0.01) {
      setPaymentError(
        'O valor da compra já foi atingido. Remova um pagamento para alterar.'
      );
      return;
    }
    if (line.method !== 'cash' && amount > missing + 0.01) {
      setPaymentError(
        `O valor excede o restante da venda (${currency(missing)}).`
      );
      return;
    }
    setPaymentError('');
    updatePayment(index, { confirmed: true });
    // Se ainda falta valor, adiciona automaticamente uma nova linha de pagamento.
    if (missing - amount > 0.01) {
      setPayments((previous) => [
        ...previous,
        {
          method: 'pix',
          amount: '',
          installments: 1,
          cardSaleId: '',
          authorizationCode: '',
        },
      ]);
    }
  };

  // Avança para o fechamento somente com caixa aberto; sem caixa, abre o
  // modal de aviso com atalho para a tela de abertura.
  const goCheckout = () => {
    if (cashierId) setStep('checkout');
    else setCashierNotice(true);
  };

  const add = (product: Row) => {
    setCart((previous) => {
      const existing = previous.find(
        (item) => item.product._id === product._id
      );
      return existing
        ? previous.map((item) =>
            item === existing ? { ...item, quantity: item.quantity + 1 } : item
          )
        : [...previous, { product, quantity: 1, discount: 0 }];
    });
  };

  // Resumo do pagamento combinado: apenas linhas confirmadas contam na cobertura.
  const confirmedPayments = payments.filter((line) => line.confirmed);
  const nonCashBase = confirmedPayments.reduce((sum, line) => {
    const amount = Number(line.amount) || 0;
    if (line.method === 'cash') return sum;
    return sum + amount;
  }, 0);
  const cashGiven = confirmedPayments.reduce(
    (sum, line) => sum + (line.method === 'cash' ? Number(line.amount) || 0 : 0),
    0
  );
  const requiredCash = Math.max(0, round2(total - nonCashBase));
  const change = Math.max(0, round2(cashGiven - requiredCash));
  const covered = nonCashBase + Math.min(cashGiven, requiredCash);
  const missing = Math.max(0, round2(total - covered));

  // Preenche automaticamente o valor da linha de pagamento em edição com o
  // restante a pagar, facilitando o lançamento. Só atualiza se o campo estiver
  // vazio ou ainda contiver o restante calculado anteriormente.
  const missingRef = useRef(0);
  useEffect(() => {
    const previousMissing = missingRef.current;
    missingRef.current = missing;
    setPayments((previous) => {
      const index = previous.findIndex((line) => !line.confirmed);
      if (index < 0) return previous;
      const line = previous[index];
      if (line.amount !== '' && Number(line.amount) !== previousMissing)
        return previous;
      const next = [...previous];
      next[index] = { ...line, amount: missing > 0 ? String(missing) : '' };
      return next;
    });
  }, [missing]);

  // Para crédito: valor cobrado do cliente = parcela * (1 + juros%).
  const creditCharge = (line: PaymentLine) => {
    const share = Number(line.amount) || 0;
    const rate = interestFor(line.installments);
    return { charged: round2(share * (1 + rate / 100)), rate };
  };

  // Juros de crédito confirmados somam por fora do valor da venda.
  const interestTotal = round2(
    confirmedPayments.reduce(
      (sum, line) =>
        line.method === 'credit_card'
          ? sum + (creditCharge(line).charged - (Number(line.amount) || 0))
          : sum,
      0
    )
  );

  const finish = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      if (!cashierId)
        throw new Error('Abra um caixa para o usuário atual antes de vender.');
      if (!cart.length) throw new Error('Adicione pelo menos um produto.');
      if (
        !Number.isFinite(total) ||
        !Number.isFinite(discount) ||
        discount < 0 ||
        discount > subtotal
      )
        throw new Error('Desconto total inválido.');
      for (const item of cart) {
        if (
          !Number.isFinite(item.quantity) ||
          item.quantity <= 0 ||
          item.quantity > Number(item.product.quantityInStock)
        )
          throw new Error(
            `Quantidade inválida ou estoque insuficiente: ${item.product.name}.`
          );
        if (!Number.isInteger(item.quantity))
          throw new Error(
            `A quantidade de ${item.product.name} deve ser inteira.`
          );
        if (
          !Number.isFinite(item.discount) ||
          item.discount < 0 ||
          item.discount > Number(item.product.price) * item.quantity
        )
          throw new Error(`Desconto inválido: ${item.product.name}.`);
      }
      if (payments.some((line) => !line.confirmed))
        throw new Error('Confirme ou remova o pagamento que está sendo editado.');
      if (!confirmedPayments.length)
        throw new Error('Informe ao menos um pagamento.');
      for (const line of confirmedPayments) {
        const amount = Number(line.amount);
        if (!Number.isFinite(amount) || amount <= 0)
          throw new Error('Todo pagamento precisa de um valor maior que zero.');
        if (line.method === 'credit_card' && line.installments < 1)
          throw new Error('Informe as parcelas do cartão de crédito.');
      }
      if (nonCashBase > total + 0.01)
        throw new Error('Pagamentos não em dinheiro excedem o total da venda.');
      if (missing > 0.01)
        throw new Error(
          `Ainda faltam ${currency(missing)} para cobrir a venda.`
        );
      setBusy(true);
      const response = await client.post('/orders', {
        cashierId,
        customerId: customerId || null,
        items: cart.map((item) => ({
          productId: item.product._id,
          quantity: item.quantity,
          discount: item.discount,
        })),
        discount,
        // Envia cada linha; no crédito vai o valor já com juros embutido.
        payments: confirmedPayments.map((line) => {
          const isCredit = line.method === 'credit_card';
          const { charged, rate } = isCredit
            ? creditCharge(line)
            : { charged: Number(line.amount), rate: 0 };
          return {
            method: line.method,
            amount: charged,
            installments: isCredit ? line.installments : undefined,
            cardSaleId: line.cardSaleId || undefined,
            authorizationCode: line.authorizationCode || undefined,
          };
        }),
        observations,
      });
      setFinishedOrder(response.data.data.order);
      setStep('items');
      setSearched(false);
      setProducts([]);
      setCart([]);
      setDiscount(0);
      setPayments([
        { method: 'pix', amount: '', installments: 1, cardSaleId: '', authorizationCode: '' },
      ]);
      setObservations('');
      setCustomerId('');
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  // Lista compacta dos itens da venda (nome, resumo, ações e edição inline),
  // usada tanto na etapa de seleção quanto no fechamento.
  const cartList = (
    <div className="modal-scroll max-h-[55vh] space-y-2 overflow-y-auto">
      {!cart.length && (
        <p className="rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-500">
          Adicione produtos para iniciar a venda.
        </p>
      )}
      {cart.map((item, index) => {
        const itemKey = String(item.product._id);
        const editing = editingItem === itemKey;
        const itemTotal = Number(item.product.price) * item.quantity - item.discount;
        return (
          <div key={itemKey} className="rounded-lg border">
            <div className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate text-base font-medium">{String(item.product.name)}</p>
                <p className="text-sm text-slate-500">
                  {item.quantity} {String(item.product.unit)} ×{' '}
                  {display(item.product.price, 'price')}
                  {item.discount > 0 &&
                    ` · desc. ${display(item.discount, 'discount')}`}
                </p>
              </div>
              <span className="whitespace-nowrap text-base font-semibold">
                {display(itemTotal, 'total')}
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => setEditingItem(editing ? null : itemKey)}
                >
                  {editing ? 'Fechar' : 'Editar'}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
                  onClick={() => {
                    setCart(cart.filter((_, itemIndex) => itemIndex !== index));
                    if (editingItem === itemKey) setEditingItem(null);
                  }}
                >
                  Remover
                </button>
              </div>
            </div>
            {editing && (
              <div className="grid grid-cols-2 gap-3 border-t p-4">
                <label className="text-sm text-slate-500">
                  Quantidade
                  <input
                    aria-label={`Quantidade de ${item.product.name}`}
                    className="admin-input mt-1 py-2.5 text-base"
                    type="number"
                    // Quantidade somente inteira (validado também no backend).
                    min={1}
                    max={Number(item.product.quantityInStock)}
                    step={1}
                    required
                    value={item.quantity}
                    onChange={(event) =>
                      setCart(
                        cart.map((entry, itemIndex) =>
                          itemIndex === index
                            ? { ...entry, quantity: Number(event.target.value) }
                            : entry
                        )
                      )
                    }
                  />
                </label>
                <label className="text-sm text-slate-500">
                  Desconto do item (R$)
                  <input
                    aria-label={`Desconto de ${item.product.name}`}
                    className="admin-input mt-1 py-2.5 text-base"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={item.discount}
                    onChange={(event) =>
                      setCart(
                        cart.map((entry, itemIndex) =>
                          itemIndex === index
                            ? { ...entry, discount: Number(event.target.value) }
                            : entry
                        )
                      )
                    }
                  />
                </label>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // Resultados da busca de produtos: cada linha adiciona o item à venda.
  const resultsList = (
    <div className="space-y-2">
      {!products.length && (
        <p className="py-6 text-center text-sm text-slate-500">
          {search.trim()
            ? 'Nenhum produto encontrado para a busca.'
            : 'Nenhum produto cadastrado.'}
        </p>
      )}
      {products.map((product) => (
        <button
          key={String(product._id)}
          type="button"
          onClick={() => add(product)}
          disabled={busy || Number(product.quantityInStock) <= 0}
          className="flex w-full items-center justify-between gap-3 rounded-lg border p-4 text-left hover:border-blue-400 hover:bg-blue-50 disabled:opacity-40"
        >
          <div>
            <p className="text-base font-semibold">{String(product.name)}</p>
            <p className="text-sm text-slate-500">
              {String(product.sku)} · Estoque:{' '}
              {Number(product.quantityInStock)} {String(product.unit)}
            </p>
          </div>
          <span className="whitespace-nowrap text-base font-semibold text-blue-700">
            {display(product.price, 'price')} +
          </span>
        </button>
      ))}
    </div>
  );

  return (
    <main className="mx-auto max-w-screen-2xl p-4 sm:p-8">
      <PageHeading
        title="Frente de caixa · PDV"
        description="Registre uma venda com baixa de estoque e pagamento integrado ao caixa."
      >
        <Link href="/management/cashiers" className="admin-secondary">
          Gerenciar caixa
        </Link>
      </PageHeading>
      <div className="mb-4 space-y-3">
        <Notice error={error} />
        {!tenantId && <Notice message="Selecione uma empresa no cabeçalho." />}
      </div>
      {loading ? (
        <p role="status">Carregando PDV...</p>
      ) : (
        tenantId && (
          step === 'items' ? (
            // Etapa 1 em duas colunas: seleção de produtos à esquerda e
            // itens da venda + botão de fechar à direita.
            <div className="grid items-start gap-6 xl:grid-cols-2">
              <section className="admin-panel space-y-5">
                <h2 className="text-lg font-bold">Seleção de produtos</h2>
                <div>
                  <label htmlFor="product-search" className="admin-label">
                    Buscar produto por nome, SKU ou categoria
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="product-search"
                      className="admin-input flex-1"
                      placeholder="Digite para buscar produtos"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          void searchProducts();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="admin-secondary whitespace-nowrap"
                      title="Deixe em branco para listar todos os produtos"
                      onClick={() => void searchProducts()}
                    >
                      Buscar
                    </button>
                  </div>
                </div>
                {searched && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-slate-700">
                      Resultados
                    </h3>
                    <div className="modal-scroll max-h-[60vh] space-y-2 overflow-y-auto">
                      {resultsList}
                    </div>
                  </div>
                )}
              </section>
              <section className="admin-panel flex flex-col space-y-4">
                <h3 className="text-lg font-bold">Itens da venda</h3>
                {cartList}
                <div className="mt-auto border-t pt-4">
                  <p className="mb-3 text-sm text-slate-600">
                    {cart.length} {cart.length === 1 ? 'item' : 'itens'} ·
                    Subtotal{' '}
                    <strong className="text-base">{currency(total)}</strong>
                  </p>
                  <button
                    type="button"
                    className="admin-primary w-full py-3 text-base"
                    disabled={!cart.length}
                    onClick={goCheckout}
                  >
                    Fechar venda →
                  </button>
                </div>
              </section>
            </div>
          ) : (
          // Etapa 2: fechamento — cliente e itens à esquerda, desconto,
          // pagamentos e totalização à direita.
          <div className="grid items-start gap-6 xl:grid-cols-2">
            <section className="admin-panel space-y-5 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold">Venda atual</h2>
                <button
                  type="button"
                  className="admin-secondary"
                  onClick={() => setStep('items')}
                >
                  ← Voltar para produtos
                </button>
              </div>
              <div>
                <label htmlFor="customer" className="admin-label text-base">
                  Cliente (opcional)
                </label>
                <div className="mt-1 flex gap-2">
                  <div className="relative flex-1">
                    {customerId ? (
                      // Cliente selecionado: exibe o nome com opção de limpar.
                      <div className="admin-input flex items-center justify-between py-3 text-base">
                        <span className="font-medium">{customerName}</span>
                        <button
                          type="button"
                          className="text-xs text-slate-500 hover:text-red-600"
                          onClick={() => {
                            setCustomerId('');
                            setCustomerName('');
                          }}
                        >
                          Remover
                        </button>
                      </div>
                    ) : (
                      <input
                        id="customer"
                        className="admin-input w-full py-3 text-base"
                        placeholder="Consumidor não identificado — busque por nome, CPF/CNPJ ou telefone"
                        value={customerQuery}
                        onChange={(event) =>
                          setCustomerQuery(event.target.value)
                        }
                      />
                    )}
                    {!customerId && customerResults.length > 0 && (
                      <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                        {customerResults.map((customer) => (
                          <li key={String(customer._id)}>
                            <button
                              type="button"
                              className="w-full px-4 py-3 text-left text-base hover:bg-slate-50"
                              onClick={() => {
                                setCustomerId(String(customer._id));
                                setCustomerName(String(customer.name));
                                setCustomerQuery('');
                                setCustomerResults([]);
                              }}
                            >
                              <span className="font-medium">
                                {String(customer.name)}
                              </span>
                              <span className="ml-2 text-sm text-slate-500">
                                {display(customer.document, 'document')}
                                {customer.phone
                                  ? ` · ${String(customer.phone)}`
                                  : ''}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <button
                    type="button"
                    className="admin-secondary whitespace-nowrap"
                    onClick={() => setCustomerModal(true)}
                  >
                    + Novo cliente
                  </button>
                </div>
              </div>
              <div>
                <h3 className="mb-2 text-base font-semibold text-slate-700">
                  Itens da venda
                </h3>
                {cartList}
                {cart.length > 0 && (
                  <p className="mt-3 border-t pt-3 text-base text-slate-600">
                    {cart.length} {cart.length === 1 ? 'item' : 'itens'} ·
                    Subtotal{' '}
                    <strong className="text-lg">{currency(subtotal)}</strong>
                  </p>
                )}
              </div>
            </section>
            <form className="admin-panel space-y-5 p-6" onSubmit={finish}>
              {cart.length > 0 && (
                <div className="flex items-center gap-4">
                  <p className="text-xl font-bold text-slate-900">
                    Falta Pagar:{' '}
                    <span className="font-bold text-red-800">
                      {currency(Math.max(0, missing))}
                    </span>
                  </p>
                  {change > 0 && (
                    <p className="text-xl font-bold text-emerald-700">
                      Troco: {currency(change)}
                    </p>
                  )}
                </div>
              )}
              <label className="admin-label block w-48 text-base">
                Desconto da venda (R$)
                <input
                  className="admin-input mt-1 py-2.5 text-base [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  type="number"
                  min="0"
                  max={subtotal}
                  step="0.01"
                  placeholder="0"
                  // Campo vazio quando zero — o novo valor substitui em vez
                  // de concatenar com o "0".
                  value={discount || ''}
                  onChange={(event) =>
                    setDiscount(Number(event.target.value) || 0)
                  }
                />
              </label>
              <div className="space-y-3 rounded-lg border border-slate-200 p-5">
                <h3 className="text-base font-semibold text-slate-800">
                  Pagamentos
                </h3>
                {payments.map((line, index) => {
                  const isCash = line.method === 'cash';
                  const isCredit = line.method === 'credit_card';
                  const isCard = isCredit || line.method === 'debit_card';
                  const { charged, rate } = isCredit
                    ? creditCharge(line)
                    : { charged: 0, rate: 0 };
                  const share = Number(line.amount) || 0;
                  const locked = Boolean(line.confirmed);
                  return (
                    <div
                      key={index}
                      className={`space-y-3 rounded-lg p-3 ${locked ? 'border border-emerald-200 bg-emerald-50/50' : 'bg-slate-50'}`}
                    >
                      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                        <label className="admin-label text-base">
                          Forma
                          <select
                            className="admin-input mt-1 py-2.5 text-base"
                            disabled={locked}
                            value={line.method}
                            onChange={(event) =>
                              updatePayment(index, {
                                method: event.target.value,
                                installments: 1,
                              })
                            }
                          >
                            {PAYMENT_METHODS.map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="admin-label text-base">
                          {isCash ? 'Valor entregue (R$)' : 'Valor (R$)'}
                          <input
                            className="admin-input mt-1 py-2.5 text-base [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            type="number"
                            min="0.01"
                            step="0.01"
                            required
                            disabled={locked}
                            value={line.amount}
                            onChange={(event) =>
                              updatePayment(index, {
                                amount: event.target.value,
                              })
                            }
                          />
                        </label>
                        {locked ? (
                          <button
                            type="button"
                            className="text-base text-red-700"
                            onClick={() => removePayment(index)}
                          >
                            Remover
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="admin-primary px-4 py-2.5 text-base"
                            disabled={(Number(line.amount) || 0) <= 0}
                            onClick={() => confirmPayment(index)}
                          >
                            Adicionar
                          </button>
                        )}
                      </div>
                      {locked && (
                        <p className="text-sm font-medium text-emerald-700">
                          Pagamento adicionado
                        </p>
                      )}
                      {locked && (isCredit || isCard) && (
                        <button
                          type="button"
                          className="text-sm font-medium text-blue-700 hover:underline"
                          onClick={() =>
                            setExpandedPayments((previous) => ({
                              ...previous,
                              [index]: !previous[index],
                            }))
                          }
                        >
                          {expandedPayments[index]
                            ? '▲ Ocultar detalhes'
                            : '▼ Ver parcelas e detalhes'}
                        </button>
                      )}
                      {(!locked || expandedPayments[index]) && isCredit && (
                        <label className="admin-label text-base">
                          Parcelas
                          <select
                            className="admin-input mt-1 py-2.5 text-base"
                            disabled={locked}
                            value={line.installments}
                            onChange={(event) =>
                              updatePayment(index, {
                                installments: Number(event.target.value),
                              })
                            }
                          >
                            {(creditTable.length
                              ? creditTable
                              : Array.from({ length: 12 }, (_, i) => ({
                                  installments: i + 1,
                                  interestPercent: 0,
                                }))
                            )
                              .slice()
                              .sort(
                                (a, b) =>
                                  Number(a.installments) - Number(b.installments)
                              )
                              .map((entry) => {
                                const n = Number(entry.installments);
                                const r = interestFor(n);
                                const chargedEntry = round2(
                                  share * (1 + r / 100)
                                );
                                return (
                                  <option key={n} value={n}>
                                    {n}x de {currency(chargedEntry / n)} · total{' '}
                                    {currency(chargedEntry)}
                                    {r ? ` (${r}% juros)` : ''}
                                  </option>
                                );
                              })}
                          </select>
                        </label>
                      )}
                      {(!locked || expandedPayments[index]) && isCredit && share > 0 && (
                        <p className="text-right text-base">
                          <span className="text-sm text-slate-500">
                            {line.installments}x de{' '}
                            {currency(charged / line.installments)}
                            {rate ? ` · juros ${rate}%` : ''}
                          </span>{' '}
                          <strong>{currency(charged)}</strong>
                        </p>
                      )}
                      {(!locked || expandedPayments[index]) && isCard && (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="admin-label text-base">
                            CV (venda no comprovante)
                            <input
                              className="admin-input mt-1 py-2.5 text-base"
                              disabled={locked}
                              value={line.cardSaleId}
                              placeholder="Opcional"
                              onChange={(event) =>
                                updatePayment(index, {
                                  cardSaleId: event.target.value,
                                })
                              }
                            />
                          </label>
                          <label className="admin-label text-base">
                            AUTO (autorização)
                            <input
                              className="admin-input mt-1 py-2.5 text-base"
                              disabled={locked}
                              value={line.authorizationCode}
                              placeholder="Opcional"
                              onChange={(event) =>
                                updatePayment(index, {
                                  authorizationCode: event.target.value,
                                })
                              }
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
                {paymentError && (
                  <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-base text-red-800">
                    {paymentError}
                  </p>
                )}
              </div>
              <label className="admin-label text-base">
                Observações
                <textarea
                  className="admin-input mt-1 py-2.5 text-base"
                  rows={3}
                  value={observations}
                  onChange={(event) => setObservations(event.target.value)}
                />
              </label>
              {interestTotal > 0 && (
                <div className="flex justify-between border-t pt-4 text-base">
                  <span className="text-slate-600">Juros (crédito)</span>
                  <span className="font-semibold">{currency(interestTotal)}</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between border-t pt-4 text-base">
                  <span className="text-slate-600">Desconto</span>
                  <span className="font-semibold">- {currency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-4 text-2xl font-bold">
                <span>Total</span>
                <span>{display(round2(total + interestTotal), 'total')}</span>
              </div>
              {change > 0 && (
                <p className="text-right text-base text-emerald-700 font-semibold">
                  Troco: {currency(change)}
                </p>
              )}
              <button
                className="admin-primary w-full py-3 text-lg"
                disabled={busy || !cashierId || !cart.length}
              >
                {busy ? 'Finalizando...' : 'Finalizar venda'}
              </button>
            </form>
          </div>
          )
        )
      )}
      {finishedOrder && (
        <Modal
          title="Venda finalizada"
          onClose={() => setFinishedOrder(null)}
        >
          <div className="space-y-5">
            {/* Confirmação com ícone e destaque do número da venda. */}
            <div className="flex flex-col items-center gap-2 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-700">
                ✓
              </span>
              <p className="text-xl font-bold text-emerald-700">
                Venda {display(finishedOrder.orderNumber, 'orderNumber')}{' '}
                concluída com sucesso!
              </p>
              <p className="text-sm text-slate-500">
                {new Date(String(finishedOrder.createdAt)).toLocaleString('pt-BR')}
                {Boolean(finishedOrder.createdBy) &&
                  ` · Operador: ${display(finishedOrder.createdBy, 'createdBy')}`}
              </p>
            </div>

            {/* Dados da venda */}
            <dl className="grid gap-3 rounded-lg border border-slate-200 p-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-500">
                  Cliente
                </dt>
                <dd className="text-sm font-medium text-slate-800">
                  {finishedOrder.customerId
                    ? display(finishedOrder.customerId, 'customerId')
                    : 'Consumidor não identificado'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-500">
                  Itens
                </dt>
                <dd className="text-sm font-medium text-slate-800">
                  {((finishedOrder.items as Row[]) || []).length} item(ns)
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-500">
                  Situação
                </dt>
                <dd className="text-sm font-medium text-emerald-700">
                  {display(finishedOrder.status, 'status')}
                </dd>
              </div>
            </dl>

            {/* Itens da venda — mesmo formato da tabela nos detalhes. */}
            {(() => {
              const items = (finishedOrder.items as Row[]) || [];
              if (!items.length) return null;
              const itemsTotal = items.reduce(
                (sum, item) => sum + (Number(item.total) || 0),
                0
              );
              const cell = 'px-3 py-2 text-slate-700';
              return (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr className="divide-x divide-slate-200">
                        <th className="px-3 py-2 font-semibold">Qtde</th>
                        <th className="px-3 py-2 font-semibold">Produto</th>
                        <th className="px-3 py-2 text-right font-semibold">
                          Unitário
                        </th>
                        <th className="px-3 py-2 text-right font-semibold">
                          Desc.
                        </th>
                        <th className="px-3 py-2 text-right font-semibold">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item, index) => (
                        <tr key={index} className="divide-x divide-slate-100">
                          <td className={cell}>{Number(item.quantity)}</td>
                          <td className={cell}>{String(item.name)}</td>
                          <td className={`${cell} text-right`}>
                            {currency(Number(item.unitPrice) || 0)}
                          </td>
                          <td className={`${cell} text-right`}>
                            {Number(item.discount) > 0
                              ? currency(Number(item.discount))
                              : '—'}
                          </td>
                          <td className={`${cell} text-right`}>
                            {currency(Number(item.total) || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      {Number(finishedOrder.discount) > 0 && (
                        <tr className="border-t border-slate-200">
                          <td
                            className="px-3 py-2 text-slate-600"
                            colSpan={4}
                          >
                            Desconto total da venda
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-slate-600">
                            -{' '}
                            {display(finishedOrder.discount, 'discount')}
                          </td>
                        </tr>
                      )}
                      <tr className="border-t border-slate-200 bg-slate-50">
                        <td
                          className="px-3 py-2 font-semibold text-slate-900"
                          colSpan={4}
                        >
                          Total dos itens
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-slate-900">
                          {currency(
                            itemsTotal -
                              (Number(finishedOrder.discount) || 0)
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              );
            })()}

            {/* Pagamentos */}
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">
                Pagamentos
              </p>
              <dl className="space-y-1.5 text-sm">
                {(finishedOrder.paymentIds as Row[] | undefined)?.map(
                  (payment, index) => (
                    <div
                      key={index}
                      className="flex justify-between rounded-lg border border-slate-100 px-3 py-2"
                    >
                      <dt>
                        {labels[String(payment.method)] ||
                          String(payment.method)}
                        {payment.installments
                          ? ` · ${payment.installments}x`
                          : ''}
                      </dt>
                      <dd className="font-medium">
                        {display(payment.amount, 'amount')}
                      </dd>
                    </div>
                  )
                )}
                {Number(finishedOrder.change) > 0 && (
                  <div className="flex justify-between px-3 py-1 font-semibold text-emerald-700">
                    <dt>Troco</dt>
                    <dd>{display(finishedOrder.change, 'change')}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Resumo financeiro — no final, abaixo dos pagamentos. */}
            <dl className="space-y-1.5 rounded-lg bg-slate-50 p-4 text-sm">
              {Number(finishedOrder.discount) > 0 && (
                <div className="flex justify-between">
                  <dt className="text-slate-600">Desconto</dt>
                  <dd>- {display(finishedOrder.discount, 'discount')}</dd>
                </div>
              )}
              {(() => {
                // Juros = soma do interestAmount dos pagamentos da venda.
                const interest = (
                  (finishedOrder.paymentIds as Row[]) || []
                ).reduce(
                  (sum, p) => sum + (Number(p.interestAmount) || 0),
                  0
                );
                return interest > 0 ? (
                  <div className="flex justify-between">
                    <dt className="text-slate-600">Juros (crédito)</dt>
                    <dd>+ {display(interest, 'interestAmount')}</dd>
                  </div>
                ) : null;
              })()}
              <div className="flex justify-between text-lg font-bold">
                <dt>Total</dt>
                {/* amountPaid já inclui os juros cobrados do cliente. */}
                <dd>
                  {display(
                    finishedOrder.amountPaid ?? finishedOrder.total,
                    'total'
                  )}
                </dd>
              </div>
            </dl>

            <div className="flex justify-end gap-3 border-t pt-4">
              <button
                type="button"
                className="admin-secondary"
                onClick={() => window.print()}
              >
                Imprimir cupom
              </button>
              <button
                type="button"
                className="admin-primary"
                onClick={() => setFinishedOrder(null)}
              >
                Nova venda
              </button>
            </div>
          </div>
          <Receipt order={finishedOrder} tenant={tenant} />
        </Modal>
      )}
      {cashierNotice && (
        <Modal
          title="Caixa fechado"
          onClose={() => setCashierNotice(false)}
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Você precisa abrir um caixa antes de finalizar a venda.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="admin-secondary"
                onClick={() => setCashierNotice(false)}
              >
                Voltar
              </button>
              <Link href="/management/cashiers" className="admin-primary">
                Abrir caixa
              </Link>
            </div>
          </div>
        </Modal>
      )}
      {customerModal && (
        <Modal title="Novo cliente" onClose={() => setCustomerModal(false)}>
          <RecordForm
            fields={screens.customers.fields ?? []}
            submitLabel="Criar cliente"
            onSubmit={createCustomer}
            onCancel={() => setCustomerModal(false)}
          />
        </Modal>
      )}
    </main>
  );
}

// Cupom não fiscal em layout de bobina 80mm, visível apenas na impressão.
// Cabeçalho universal: razão social, documento, endereço e telefone da empresa.
function Receipt({
  order,
  tenant,
}: {
  order: Row;
  tenant: {
    displayName?: string;
    name?: string;
    document?: string;
    documentType?: 'cpf' | 'cnpj';
    phone?: string;
    address?: {
      street?: string;
      number?: string;
      complement?: string;
      neighborhood?: string;
      city?: string;
      state?: string;
      zipCode?: string;
    };
  } | null;
}) {
  const items = (order.items as Row[] | undefined) || [];
  const payments = (order.paymentIds as Row[] | undefined) || [];
  const money = (value: unknown) => currency(Number(value) || 0);
  const interestTotal = payments.reduce(
    (sum, payment) => sum + (Number(payment.interestAmount) || 0),
    0
  );
  const subtotal = items.reduce(
    (sum, item) => sum + (Number(item.total) || 0),
    0
  );

  // Monta linhas de endereço no formato padrão de cupom.
  const address = tenant?.address || {};
  const streetLine = [
    address.street,
    address.number ? `nº ${address.number}` : '',
    address.neighborhood,
  ]
    .filter(Boolean)
    .join(' ');
  const cityLine = [
    [address.city, address.state].filter(Boolean).join(' - '),
    address.zipCode ? `CEP ${address.zipCode}` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="print-area">
      <div className="receipt">
        {/* Identificação da empresa (padrão de cupom). */}
        <h1>{String(tenant?.displayName || tenant?.name || 'Empresa')}</h1>
        {tenant?.document && (
          <p className="receipt-center">
            {tenant.documentType === 'cpf' ? 'CPF' : 'CNPJ'}:{' '}
            {String(tenant.document)}
          </p>
        )}
        {streetLine && <p className="receipt-center">{streetLine}</p>}
        {cityLine && <p className="receipt-center">{cityLine}</p>}
        {tenant?.phone && (
          <p className="receipt-center">Tel: {String(tenant.phone)}</p>
        )}
        <div className="receipt-line" />

        <p className="receipt-center">Cupom não fiscal</p>
        <p>
          Venda {display(order.orderNumber, 'orderNumber')} ·{' '}
          {new Date(String(order.createdAt)).toLocaleString('pt-BR')}
        </p>
        <p>
          Cliente:{' '}
          {Boolean(order.customerId)
            ? display(order.customerId, 'customerId')
            : 'Consumidor não identificado'}
        </p>
        {Boolean(order.createdBy) && (
          <p>Operador: {display(order.createdBy, 'createdBy')}</p>
        )}
        <div className="receipt-line" />

        <table>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                <td>
                  {String(item.name)}
                  <br />
                  {Number(item.quantity)} {String(item.unit)} x{' '}
                  {money(item.unitPrice)}
                  {Number(item.discount) > 0 &&
                    ` (desc. ${money(item.discount)})`}
                </td>
                <td className="receipt-right">{money(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="receipt-line" />

        <p>Subtotal: {money(subtotal)}</p>
        {Number(order.discount) > 0 && (
          <p>Desconto: -{money(order.discount)}</p>
        )}
        {interestTotal > 0 && <p>Juros (crédito): {money(interestTotal)}</p>}
        <p className="receipt-total receipt-right">
          TOTAL {money(round2(Number(order.total) + interestTotal))}
        </p>
        <div className="receipt-line" />

        {payments.map((payment, index) => (
          <p key={index}>
            {labels[String(payment.method)] || String(payment.method)}
            {payment.installments ? ` ${payment.installments}x` : ''}:{' '}
            {money(payment.amount)}
          </p>
        ))}
        {Number(order.change) > 0 && <p>Troco: {money(order.change)}</p>}

        {Boolean(order.observations) && (
          <>
            <div className="receipt-line" />
            <p>Obs: {String(order.observations)}</p>
          </>
        )}

        <div className="receipt-line" />
        <p className="receipt-center">Obrigado pela preferência!</p>
        <p className="receipt-center">Não é documento fiscal</p>
      </div>
    </div>
  );
}
