'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useWorkspaceApi } from '../AdminShell';
import { useAuth } from '../context/AuthContext';
import {
  addressFields,
  display,
  getValue,
  type Field,
  type Row,
} from './config';
import { hasPermission } from '@/lib/permissions';
import { errorMessage, Modal, Notice, PageHeading, RecordForm } from './ui';
import { RecordDetails } from './ResourceScreen';

const companyFields: Field[] = [
  { key: 'name', label: 'Razão social / nome', required: true },
  { key: 'displayName', label: 'Nome de exibição', maxLength: 120 },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Telefone' },
  ...addressFields,
  { key: 'colors.primary', label: 'Cor primária (#RRGGBB)', type: 'color' },
  { key: 'colors.secondary', label: 'Cor secundária (#RRGGBB)', type: 'color' },
];

export function CompanyScreen() {
  const { client, tenantId } = useWorkspaceApi();
  const { refreshSession, user } = useAuth();
  const [company, setCompany] = useState<Row | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  // O formulário nasce em modo leitura; Editar habilita os campos e troca
  // o botão por Salvar/Voltar. O backend reforça a mesma permissão no PUT.
  const [editingCompany, setEditingCompany] = useState(false);
  const canEdit = hasPermission(user?.permissions, 'tenant:write');
  useEffect(() => {
    if (!tenantId) return;
    let active = true;
    client
      .get('/tenants/me')
      .then((response) => {
        if (active) setCompany(response.data.data.tenant);
      })
      .catch((cause) => {
        if (active) setError(errorMessage(cause));
      });
    return () => {
      active = false;
    };
  }, [client, tenantId]);
  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4 sm:p-8">
      <PageHeading
        title="Minha empresa"
        description="Atualize os dados de contato e a identidade visual. Plano, documento e situação são gerenciados pela plataforma."
      />
      <Notice error={error} message={message} />
      {!tenantId ? (
        <Notice message="Selecione uma empresa no cabeçalho." />
      ) : company ? (
        <>
          <section className="admin-panel">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  Dados e personalização
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Documento: {String(company.document || 'Não informado')} ·
                  Plano: {String(company.plan || '—')}
                </p>
              </div>
              {!editingCompany && canEdit && (
                <button
                  type="button"
                  className="admin-secondary"
                  onClick={() => {
                    setError('');
                    setMessage('');
                    setEditingCompany(true);
                  }}
                >
                  Editar
                </button>
              )}
            </div>
            {editingCompany ? (
              <RecordForm
                fields={companyFields}
                initial={{
                  ...company,
                  colors: {
                    primary: '#2563eb',
                    secondary: '#1e40af',
                    ...((company.colors as Row) || {}),
                  },
                }}
                editing
                onCancel={() => setEditingCompany(false)}
                onSubmit={async (payload) => {
                  const response = await client.put('/tenants/me', payload);
                  setCompany(response.data.data.tenant);
                  await refreshSession();
                  setMessage('Dados salvos com sucesso.');
                  setEditingCompany(false);
                }}
              />
            ) : (
              <CompanyDetails company={company} />
            )}
          </section>
          <PaymentFeesSection
            fees={(company.paymentFees as Row) || {}}
            canEdit={canEdit}
            onSaved={(fees) => {
              setCompany({ ...company, paymentFees: fees });
              setMessage('Taxas de pagamento salvas.');
            }}
          />
          {/* A key remonta a seção quando o modo salvo muda, resetando o estado local. */}
          <CashierModeSection
            key={String(company.cashierMode || 'per_operator')}
            mode={String(company.cashierMode || 'per_operator')}
            canEdit={canEdit}
            onSaved={(cashierMode) => {
              setCompany({ ...company, cashierMode });
              setMessage('Modo de operação do caixa salvo.');
            }}
          />
          <section className="admin-panel">
            <h2 className="text-lg font-semibold">Logo da empresa</h2>
            <p className="mt-1 text-sm text-slate-500">
              PNG, JPEG ou WebP de até 2 MB. A logo aparece no menu lateral.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              {typeof company.logoUrl === 'string' && company.logoUrl ? (
                <Image
                  src={company.logoUrl}
                  alt="Logo da empresa"
                  width={64}
                  height={64}
                  unoptimized
                  className="h-16 w-16 rounded-xl border border-slate-200 bg-white object-contain p-1"
                />
              ) : (
                // Sem logo: mesma inicial azul exibida no menu lateral.
                <span className="grid h-16 w-16 place-items-center rounded-xl bg-blue-600 text-xl font-bold text-white">
                  {String(company.displayName || company.name || 'E')
                    .charAt(0)
                    .toUpperCase()}
                </span>
              )}
              {canEdit && (
                <div className="flex flex-col gap-1">
                  <label className="admin-secondary inline-flex cursor-pointer items-center justify-center">
                    {uploading
                      ? 'Enviando...'
                      : company.logoUrl
                        ? 'Trocar logo'
                        : 'Enviar logo'}
                    <input
                      aria-label="Enviar logo da empresa"
                      type="file"
                      className="hidden"
                      accept="image/png,image/jpeg,image/webp"
                      disabled={uploading}
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        // Reseta o input para permitir reenviar o mesmo arquivo.
                        event.target.value = '';
                        if (!file) return;
                        setError('');
                        if (
                          ![
                            'image/png',
                            'image/jpeg',
                            'image/webp',
                          ].includes(file.type) ||
                          file.size > 2 * 1024 * 1024
                        ) {
                          setError(
                            'Escolha uma imagem PNG, JPEG ou WebP de até 2 MB.'
                          );
                          return;
                        }
                        setUploading(true);
                        try {
                          const body = new FormData();
                          body.append('logo', file);
                          const response = await client.post(
                            '/tenants/me/logo',
                            body
                          );
                          setCompany(response.data.data.tenant);
                          await refreshSession();
                          setMessage('Logo atualizada com sucesso.');
                        } catch (cause) {
                          setError(errorMessage(cause));
                        } finally {
                          setUploading(false);
                        }
                      }}
                    />
                  </label>
                  {typeof company.logoUrl === 'string' && company.logoUrl && (
                    <button
                      type="button"
                      className="text-sm font-medium text-red-700 hover:underline disabled:opacity-50"
                      disabled={uploading}
                      onClick={async () => {
                        setError('');
                        setUploading(true);
                        try {
                          const response = await client.put('/tenants/me', {
                            logoUrl: null,
                          });
                          setCompany(response.data.data.tenant);
                          await refreshSession();
                          setMessage('Logo removida com sucesso.');
                        } catch (cause) {
                          setError(errorMessage(cause));
                        } finally {
                          setUploading(false);
                        }
                      }}
                    >
                      Remover logo
                    </button>
                  )}
                </div>
              )}
            </div>
            {uploading && (
              <p role="status" className="mt-3 text-sm">
                Enviando imagem...
              </p>
            )}
          </section>
        </>
      ) : (
        !error && <p role="status">Carregando empresa...</p>
      )}
    </main>
  );
}

// Visão somente leitura dos dados da empresa: mesma ordem de campos do
// formulário, valores formatados (telefone/CEP) e amostra das cores.
function CompanyDetails({ company }: { company: Row }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {companyFields.map((field) => {
        const raw = getValue(company, field.key);
        const hex =
          field.type === 'color' && /^#[0-9a-f]{6}$/i.test(String(raw || ''))
            ? String(raw)
            : null;
        return (
          <div
            key={field.key}
            className="rounded-lg border border-slate-200 bg-slate-50 p-3"
          >
            <dt className="mb-1 text-xs font-semibold uppercase text-slate-500">
              {field.label}
            </dt>
            <dd className="text-sm font-medium text-slate-900">
              {hex ? (
                <span className="inline-flex items-center gap-2">
                  <span
                    aria-hidden
                    className="h-4 w-4 rounded-full border border-slate-300"
                    style={{ backgroundColor: hex }}
                  />
                  {hex}
                </span>
              ) : (
                // O último segmento da chave garante a máscara certa nos
                // campos aninhados (ex.: address.zipCode → zipCode).
                display(raw, field.key.split('.').pop() || field.key)
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

// Configuração das taxas de recebimento do tenant: pix/débito e a tabela de
// juros por parcela do crédito (repassados ao cliente no PDV).
function PaymentFeesSection({
  fees,
  onSaved,
  canEdit,
}: {
  fees: Row;
  onSaved: (fees: Row) => void;
  canEdit: boolean;
}) {
  const { client } = useWorkspaceApi();
  const [open, setOpen] = useState(false);
  const [pix, setPix] = useState(String(fees.pixPercent ?? 0));
  const [debit, setDebit] = useState(String(fees.debitPercent ?? 0));
  const [rows, setRows] = useState<{ installments: string; interestPercent: string }[]>(
    () =>
      ((fees.creditInstallments as Row[]) || []).map((entry) => ({
        installments: String(entry.installments),
        interestPercent: String(entry.interestPercent),
      }))
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      const pixPercent = Number(pix);
      const debitPercent = Number(debit);
      for (const [value, label] of [
        [pixPercent, 'Pix'],
        [debitPercent, 'Débito'],
      ] as const) {
        if (!Number.isFinite(value) || value < 0 || value > 100)
          throw new Error(`Taxa de ${label} deve ser entre 0 e 100%.`);
      }
      const seen = new Set<number>();
      const creditInstallments = rows
        .filter((row) => row.installments.trim() || row.interestPercent.trim())
        .map((row) => {
          const installments = Number(row.installments);
          const interestPercent = Number(row.interestPercent);
          if (!Number.isInteger(installments) || installments < 1 || installments > 48)
            throw new Error('Parcelas devem ser inteiras entre 1 e 48.');
          if (!Number.isFinite(interestPercent) || interestPercent < 0 || interestPercent > 100)
            throw new Error('Juros devem ser entre 0 e 100%.');
          if (seen.has(installments))
            throw new Error(`Parcela ${installments}x duplicada.`);
          seen.add(installments);
          return { installments, interestPercent };
        });
      setBusy(true);
      const response = await client.put('/tenants/me', {
        paymentFees: { pixPercent, debitPercent, creditInstallments },
      });
      onSaved(response.data.data.tenant.paymentFees as Row);
      setOpen(false);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  // Parcelas de crédito ordenadas para exibição nos selos do resumo.
  const creditRows = ((fees.creditInstallments as Row[]) || [])
    .slice()
    .sort((a, b) => Number(a.installments) - Number(b.installments));

  return (
    <section className="admin-panel">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Taxas de pagamento</h2>
          <p className="text-sm text-slate-500">
            Percentuais de pix, débito e juros do crédito por parcela.
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            className="admin-primary whitespace-nowrap"
            onClick={() => setOpen(true)}
          >
            Configurar taxas
          </button>
        )}
      </div>
      {/* Resumo das taxas em cards: percentuais diretos de pix/débito e a
          tabela de juros do crédito como selos por parcela. */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="mb-1 text-xs font-semibold uppercase text-slate-500">
            Pix
          </p>
          <p className="text-lg font-semibold text-slate-900">
            {Number(fees.pixPercent ?? 0)}%
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="mb-1 text-xs font-semibold uppercase text-slate-500">
            Cartão de débito
          </p>
          <p className="text-lg font-semibold text-slate-900">
            {Number(fees.debitPercent ?? 0)}%
          </p>
        </div>
      </div>
      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="mb-1 text-xs font-semibold uppercase text-slate-500">
          Cartão de crédito · juros por parcela
        </p>
        {creditRows.length ? (
          <ul className="mt-2 flex flex-wrap gap-1">
            {creditRows.map((entry) => (
              <li
                key={String(entry.installments)}
                className="rounded border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-700"
              >
                {String(entry.installments)}x ·{' '}
                {String(entry.interestPercent)}%
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm font-medium text-slate-900">
            Sem juros até 12x
          </p>
        )}
      </div>
      {open && (
        <Modal title="Configurar taxas" onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="space-y-4">
            <Notice error={error} />
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="admin-label">
                Taxa Pix (%)
                <input
                  className="admin-input mt-1"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={pix}
                  onChange={(event) => setPix(event.target.value)}
                />
              </label>
              <label className="admin-label">
                Taxa débito (%)
                <input
                  className="admin-input mt-1"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={debit}
                  onChange={(event) => setDebit(event.target.value)}
                />
              </label>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">
                  Juros do crédito por parcela
                </h3>
                <button
                  type="button"
                  className="admin-secondary"
                  onClick={() =>
                    setRows([...rows, { installments: '', interestPercent: '' }])
                  }
                >
                  + Adicionar mais uma parcela
                </button>
              </div>
              {!rows.length && (
                <p className="text-sm text-slate-500">
                  Nenhuma parcela configurada: o PDV oferecerá até 12x sem juros.
                </p>
              )}
              {rows.length > 0 && (
                <div className="rounded-lg border border-slate-200">
                  <div className="grid grid-cols-[1fr_1fr_auto] gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2">
                    <span className="text-xs font-semibold uppercase text-slate-500">
                      Parcelas
                    </span>
                    <span className="text-xs font-semibold uppercase text-slate-500">
                      Juros (%)
                    </span>
                    <span className="w-14" />
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {rows.map((row, index) => (
                      <li
                        key={index}
                        className="grid grid-cols-[1fr_1fr_auto] items-center gap-3 px-3 py-2"
                      >
                        <input
                          aria-label={`Parcelas da linha ${index + 1}`}
                          className="admin-input"
                          type="number"
                          min="1"
                          max="48"
                          step="1"
                          required
                          value={row.installments}
                          onChange={(event) =>
                            setRows(
                              rows.map((entry, i) =>
                                i === index
                                  ? { ...entry, installments: event.target.value }
                                  : entry
                              )
                            )
                          }
                        />
                        <input
                          aria-label={`Juros da linha ${index + 1}`}
                          className="admin-input"
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          required
                          value={row.interestPercent}
                          onChange={(event) =>
                            setRows(
                              rows.map((entry, i) =>
                                i === index
                                  ? { ...entry, interestPercent: event.target.value }
                                  : entry
                              )
                            )
                          }
                        />
                        <button
                          type="button"
                          className="w-14 text-xs text-red-700 hover:underline"
                          onClick={() =>
                            setRows(rows.filter((_, i) => i !== index))
                          }
                        >
                          Remover
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="admin-secondary"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </button>
              <button className="admin-primary" disabled={busy}>
                {busy ? 'Salvando...' : 'Salvar taxas'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}

// Configuração do modo de operação do caixa: por operador (uma gaveta por
// usuário, ideal para vários PDVs) ou compartilhado (caixa único da empresa,
// usado por todos os operadores ao mesmo tempo).
function CashierModeSection({
  mode,
  onSaved,
  canEdit,
}: {
  mode: string;
  onSaved: (mode: string) => void;
  canEdit: boolean;
}) {
  const { client } = useWorkspaceApi();
  // Mesmo fluxo da seção de dados: nasce em leitura; Editar habilita o
  // select e troca o botão por Salvar/Voltar; salvar remonta via key.
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(mode);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <section className="admin-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Operação do caixa</h2>
          <p className="mt-1 text-sm text-slate-500">
            Define se cada operador trabalha com o próprio caixa ou se a
            empresa usa um caixa único compartilhado.
          </p>
        </div>
        {!editing && canEdit && (
          <button
            type="button"
            className="admin-secondary"
            onClick={() => {
              setError('');
              setValue(mode);
              setEditing(true);
            }}
          >
            Editar
          </button>
        )}
      </div>
      <Notice error={error} />
      {editing ? (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="admin-label min-w-64">
            Modo de operação
            <select
              className="admin-input mt-1"
              value={value}
              onChange={(event) => setValue(event.target.value)}
            >
              <option value="per_operator">
                Por operador (um caixa por usuário)
              </option>
              <option value="shared">
                Compartilhado (caixa único da empresa)
              </option>
            </select>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              className="admin-secondary"
              disabled={busy}
              onClick={() => {
                setValue(mode);
                setEditing(false);
              }}
            >
              Voltar
            </button>
            <button
              type="button"
              className="admin-primary"
              disabled={busy || value === mode}
              onClick={async () => {
                setError('');
                setBusy(true);
                try {
                  const response = await client.put('/tenants/me', {
                    cashierMode: value,
                  });
                  onSaved(String(response.data.data.tenant.cashierMode));
                } catch (cause) {
                  setError(errorMessage(cause));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="mb-1 text-xs font-semibold uppercase text-slate-500">
            Modo de operação
          </p>
          <p className="text-sm font-medium text-slate-900">
            {mode === 'shared'
              ? 'Compartilhado (caixa único da empresa)'
              : 'Por operador (um caixa por usuário)'}
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            {mode === 'shared'
              ? 'Compartilhado: apenas um caixa fica aberto por vez e qualquer operador autorizado vende, sangra e fecha esse caixa.'
              : 'Por operador: cada usuário abre o próprio caixa e só vende nele — ideal para lojas com vários pontos de venda.'}
          </p>
        </div>
      )}
    </section>
  );
}

export function AccountScreen() {
  const { user } = useAuth();
  return (
    <main className="mx-auto max-w-3xl space-y-5 p-4 sm:p-8">
      <PageHeading
        title="Minha conta"
        description="Informações da sessão e segurança de acesso."
      />
      <section className="admin-panel">
        <RecordDetails
          row={{ name: user?.name, email: user?.email, role: user?.role }}
        />
      </section>
      <section className="admin-panel">
        <h2 className="font-semibold">Segurança da conta</h2>
        <p className="my-3 text-sm leading-6 text-slate-500">
          Para redefinir sua senha, solicite um link por email. A edição de
          dados cadastrais deve ser realizada por um administrador em
          Funcionários; a API ainda não disponibiliza edição de perfil por
          autoatendimento.
        </p>
        <Link href="/forgot-password" className="admin-secondary">
          Solicitar redefinição de senha
        </Link>
      </section>
    </main>
  );
}

// Recursos disponíveis para exportação (a API entrega o arquivo completo)
// e para importação em massa por arquivo.
const EXPORT_RESOURCES = [
  ['products', 'Produtos'],
  ['categories', 'Categorias'],
  ['customers', 'Clientes'],
  ['suppliers', 'Fornecedores'],
  ['orders', 'Vendas'],
  ['stockmovements', 'Movimentações de estoque'],
  ['bills', 'Contas a pagar/receber'],
  ['payments', 'Recebimentos'],
] as const;

const IMPORT_RESOURCES = [
  ['products', 'Produtos'],
  ['categories', 'Categorias'],
  ['customers', 'Clientes'],
  ['suppliers', 'Fornecedores'],
] as const;

// Modelos CSV baixáveis: cabeçalho aceito pela importação + uma linha de
// exemplo — os mesmos campos emitidos pela exportação (exporta→importa).
const IMPORT_TEMPLATES: Record<string, string> = {
  products:
    'name,sku,unit,price,costPrice,minStock,quantityInStock,category,isActive\n' +
    'Produto Exemplo,EX-01,un,19.90,12.50,5,10,Categoria Exemplo,true\n',
  categories:
    'name,description,isActive\nLimpeza,Produtos de limpeza,true\n',
  customers:
    'name,document,documentType,phone,email,address.street,address.number,address.complement,address.neighborhood,address.city,address.state,address.zipCode,isActive\n' +
    'Cliente Exemplo,12345678900,cpf,11999998888,cliente@email.com,Rua Exemplo,100,,Centro,São Paulo,SP,01000000,true\n',
  suppliers:
    'name,document,documentType,phone,email,contactName,address.street,address.number,address.complement,address.neighborhood,address.city,address.state,address.zipCode,isActive\n' +
    'Fornecedor Exemplo,12345678000199,cnpj,1133334444,forn@email.com,Contato Exemplo,Rua Exemplo,200,,Centro,São Paulo,SP,01000000,true\n',
};

// Resultado devolvido pela API de importação: erros por número da linha.
interface ImportResult {
  total: number;
  created: number;
  errors: { line: number; message: string }[];
}

export function ExportScreen() {
  const { client, tenantId } = useWorkspaceApi();
  const { user } = useAuth();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  // Exportação: recurso e formato escolhidos no card.
  const [resource, setResource] = useState('products');
  const [format, setFormat] = useState('csv');
  // Importação: recurso, arquivo escolhido e último resultado retornado.
  const [importTarget, setImportTarget] = useState('products');
  const [file, setFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  // A importação escreve dados: o card inteiro some para quem não tem
  // :write de nenhum recurso — a API continua bloqueando sem permissão.
  const canImport = (value: string) =>
    user?.role === 'master' ||
    hasPermission(user?.permissions, `${value}:write`);
  const importable = IMPORT_RESOURCES.filter(([value]) => canImport(value));

  // Baixa o recurso inteiro: o filename vem do Content-Disposition da API
  // (recurso_ano-mes-dia.ext) com fallback local.
  const downloadExport = async () => {
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const response = await client.get(`/export/${resource}`, {
        params: { format },
        responseType: 'blob',
      });
      const disposition = String(response.headers['content-disposition'] || '');
      const filename =
        disposition.match(/filename="([^"]+)"/)?.[1] ||
        `${resource}-${new Date().toISOString().slice(0, 10)}.${format}`;
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      const count = response.headers['x-total-count'];
      setMessage(
        `Arquivo gerado com ${count || 'todos os'} registro(s) disponíveis.`
      );
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  // Gera o modelo CSV do recurso escolhido — o usuário preenche e sobe.
  const downloadTemplate = () => {
    const blob = new Blob([IMPORT_TEMPLATES[importTarget]], {
      type: 'text/csv',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `modelo-${importTarget}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const submitImport = async () => {
    setError('');
    setMessage('');
    setImportResult(null);
    if (!file) {
      setError('Escolha um arquivo .csv ou .json para importar.');
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const response = await client.post(`/import/${importTarget}`, body);
      const result = response.data.data as ImportResult;
      setImportResult(result);
      setFile(null);
      setMessage(
        result.errors.length === 0
          ? `${result.created} registro(s) importados com sucesso.`
          : `${result.created} de ${result.total} registro(s) importados. Corrija as linhas com erro e envie novamente.`
      );
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-4xl space-y-5 p-4 sm:p-8">
      <PageHeading
        title="Importação e exportação"
        description="Baixe os dados da empresa ou importe cadastros em massa a partir de arquivos CSV/JSON."
      />
      <Notice error={error} message={message} />
      {!tenantId ? (
        <Notice message="Selecione uma empresa no cabeçalho." />
      ) : (
        <>
          <section className="admin-panel">
            <h2 className="text-lg font-semibold">Exportar dados</h2>
            <p className="mt-1 text-sm text-slate-500">
              O arquivo sai completo, com todos os registros do recurso
              escolhido — sem paginação.
            </p>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <label className="admin-label min-w-56">
                Dados
                <select
                  className="admin-input mt-1"
                  value={resource}
                  onChange={(event) => setResource(event.target.value)}
                >
                  {EXPORT_RESOURCES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="admin-label">
                Formato
                <select
                  className="admin-input mt-1"
                  value={format}
                  onChange={(event) => setFormat(event.target.value)}
                >
                  <option value="csv">CSV</option>
                  <option value="json">JSON</option>
                </select>
              </label>
              {/* mb-1.5 iguala a margem das labels para alinhar com inputs. */}
              <button
                type="button"
                className="admin-primary mb-1.5"
                disabled={busy}
                onClick={() => void downloadExport()}
              >
                {busy ? 'Gerando...' : 'Baixar arquivo'}
              </button>
            </div>
          </section>
          {importable.length > 0 && (
          <section className="admin-panel">
            <h2 className="text-lg font-semibold">Importar dados</h2>
            <p className="mt-1 text-sm text-slate-500">
              CSV ou JSON no formato do modelo. Cada registro criado fica
              auditado; o estoque inicial vira movimentação de entrada — por
              isso a importação de produtos com saldo exige permissão de
              suprimento.
            </p>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <label className="admin-label min-w-56">
                Dados
                <select
                  className="admin-input mt-1"
                  value={importTarget}
                  onChange={(event) => {
                    setImportTarget(event.target.value);
                    setFile(null);
                    setImportResult(null);
                  }}
                >
                  {importable.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="admin-secondary mb-1.5 inline-flex cursor-pointer items-center justify-center">
                {file ? file.name : 'Escolher arquivo'}
                <input
                  aria-label="Arquivo de importação"
                  type="file"
                  className="hidden"
                  accept=".csv,.json"
                  onChange={(event) => {
                    setFile(event.target.files?.[0] || null);
                    event.target.value = '';
                  }}
                />
              </label>
              <button
                type="button"
                className="admin-secondary mb-1.5"
                onClick={downloadTemplate}
              >
                Baixar modelo
              </button>
              <button
                type="button"
                className="admin-primary mb-1.5"
                disabled={busy || !file}
                onClick={() => void submitImport()}
              >
                {busy ? 'Importando...' : 'Importar'}
              </button>
            </div>
            {/* Linhas recusadas pela validação voltam aqui com número e
                motivo — o usuário corrige e reenvia só elas. */}
            {importResult && importResult.errors.length > 0 && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-semibold uppercase text-amber-700">
                  Linhas não importadas ({importResult.errors.length})
                </p>
                <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-sm text-slate-700">
                  {importResult.errors.map((entry) => (
                    <li key={entry.line}>
                      <span className="font-medium">Linha {entry.line}:</span>{' '}
                      {entry.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
          )}
        </>
      )}
    </main>
  );
}
