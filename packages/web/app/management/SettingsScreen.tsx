'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useWorkspaceApi } from '../AdminShell';
import { useAuth } from '../context/AuthContext';
import { addressFields, type Field, type Row } from './config';
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
  const { refreshSession } = useAuth();
  const [company, setCompany] = useState<Row | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
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
            <h2 className="mb-5 text-lg font-semibold">
              Dados e personalização
            </h2>
            <p className="mb-5 text-sm text-slate-500">
              Documento: {String(company.document || 'Não informado')} · Plano:{' '}
              {String(company.plan || '—')}
            </p>
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
              onSubmit={async (payload) => {
                const response = await client.put('/tenants/me', payload);
                setCompany(response.data.data.tenant);
                await refreshSession();
                setMessage('Dados salvos com sucesso.');
              }}
            />
          </section>
          <PaymentFeesSection
            fees={(company.paymentFees as Row) || {}}
            onSaved={(fees) => {
              setCompany({ ...company, paymentFees: fees });
              setMessage('Taxas de pagamento salvas.');
            }}
          />
          {/* A key remonta a seção quando o modo salvo muda, resetando o estado local. */}
          <CashierModeSection
            key={String(company.cashierMode || 'per_operator')}
            mode={String(company.cashierMode || 'per_operator')}
            onSaved={(cashierMode) => {
              setCompany({ ...company, cashierMode });
              setMessage('Modo de operação do caixa salvo.');
            }}
          />
          <section className="admin-panel">
            <h2 className="mb-2 text-lg font-semibold">Logo da empresa</h2>
            <p className="mb-4 text-sm text-slate-500">
              Envie uma imagem PNG, JPEG ou WebP de até 2 MB.
            </p>
            <input
              aria-label="Enviar logo da empresa"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={uploading}
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setError('');
                if (
                  !['image/png', 'image/jpeg', 'image/webp'].includes(
                    file.type
                  ) ||
                  file.size > 2 * 1024 * 1024
                ) {
                  setError('Escolha uma imagem PNG, JPEG ou WebP de até 2 MB.');
                  return;
                }
                setUploading(true);
                try {
                  const body = new FormData();
                  body.append('logo', file);
                  const response = await client.post('/tenants/me/logo', body);
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
            {uploading && (
              <p role="status" className="mt-3 text-sm">
                Enviando imagem...
              </p>
            )}
            {typeof company.logoUrl === 'string' && company.logoUrl && (
              <div className="mt-4 flex items-center gap-4">
                <a
                  className="text-sm text-blue-700 underline"
                  href={company.logoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Visualizar logo atual
                </a>
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
              </div>
            )}
          </section>
        </>
      ) : (
        !error && <p role="status">Carregando empresa...</p>
      )}
    </main>
  );
}

// Configuração das taxas de recebimento do tenant: pix/débito e a tabela de
// juros por parcela do crédito (repassados ao cliente no PDV).
function PaymentFeesSection({
  fees,
  onSaved,
}: {
  fees: Row;
  onSaved: (fees: Row) => void;
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

  return (
    <section className="admin-panel">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Taxas de pagamento</h2>
          <p className="text-sm text-slate-500">
            Percentuais de pix, débito e juros do crédito por parcela.
          </p>
          <p className="mt-2 text-sm text-slate-700">
            Pix: {Number(fees.pixPercent ?? 0)}% · Débito:{' '}
            {Number(fees.debitPercent ?? 0)}% · Parcelas configuradas:{' '}
            {((fees.creditInstallments as Row[]) || []).length || 'nenhuma (até 12x sem juros)'}
          </p>
        </div>
        <button
          type="button"
          className="admin-primary whitespace-nowrap"
          onClick={() => setOpen(true)}
        >
          Configurar taxas
        </button>
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
}: {
  mode: string;
  onSaved: (mode: string) => void;
}) {
  const { client } = useWorkspaceApi();
  const [value, setValue] = useState(mode);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <section className="admin-panel">
      <h2 className="text-lg font-semibold">Operação do caixa</h2>
      <p className="mb-4 text-sm text-slate-500">
        Define se cada operador trabalha com o próprio caixa ou se a empresa usa
        um caixa único compartilhado.
      </p>
      <Notice error={error} />
      <div className="flex flex-wrap items-end gap-3">
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
      <p className="mt-3 text-xs leading-5 text-slate-500">
        {value === 'shared'
          ? 'Compartilhado: apenas um caixa fica aberto por vez e qualquer operador autorizado vende, sangra e fecha esse caixa.'
          : 'Por operador: cada usuário abre o próprio caixa e só vende nele — ideal para lojas com vários pontos de venda.'}
      </p>
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

export function ExportScreen() {
  const { client, tenantId } = useWorkspaceApi();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <main className="mx-auto max-w-4xl space-y-5 p-4 sm:p-8">
      <PageHeading
        title="Exportações"
        description="Baixe os dados da empresa em CSV ou JSON. A exportação da API é paginada: cada arquivo contém até 1.000 registros."
      />
      <Notice error={error} message={message} />
      {!tenantId ? (
        <Notice message="Selecione uma empresa no cabeçalho." />
      ) : (
        <section className="admin-panel">
          <RecordForm
            fields={[
              {
                key: 'resource',
                label: 'Dados',
                required: true,
                options: [
                  ['products', 'Produtos'],
                  ['categories', 'Categorias'],
                  ['customers', 'Clientes'],
                  ['suppliers', 'Fornecedores'],
                  ['orders', 'Vendas'],
                ],
              },
              {
                key: 'format',
                label: 'Formato',
                required: true,
                options: [
                  ['csv', 'CSV'],
                  ['json', 'JSON'],
                ],
              },
              {
                key: 'page',
                label: 'Página',
                type: 'number',
                required: true,
                min: 1,
              },
            ]}
            initial={{ resource: 'products', format: 'csv', page: 1 }}
            submitLabel={busy ? 'Exportando...' : 'Baixar arquivo'}
            onSubmit={async (payload) => {
              setError('');
              setMessage('');
              if (!Number.isInteger(payload.page))
                throw new Error('A página deve ser um número inteiro.');
              setBusy(true);
              try {
                const response = await client.get(
                  `/export/${payload.resource}`,
                  {
                    params: {
                      format: payload.format,
                      page: payload.page,
                      limit: 1000,
                    },
                    responseType: 'blob',
                  }
                );
                const url = URL.createObjectURL(response.data);
                const anchor = document.createElement('a');
                anchor.href = url;
                anchor.download = `${payload.resource}-pagina-${payload.page}.${payload.format}`;
                document.body.appendChild(anchor);
                anchor.click();
                anchor.remove();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                const count = response.headers['x-total-count'];
                setMessage(
                  `Arquivo da página ${payload.page} gerado.${count ? ` Total disponível: ${count} registros.` : ' Para mais de 1.000 registros, baixe as páginas seguintes.'}`
                );
              } catch (cause) {
                setError(errorMessage(cause));
              } finally {
                setBusy(false);
              }
            }}
          />
        </section>
      )}
    </main>
  );
}
