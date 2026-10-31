'use client';

import { useEffect, useRef, useState } from 'react';
import axios, { AxiosInstance } from 'axios';
import type { Field, Row } from './config';
import { display, getValue, maskDocument } from './config';
import { useWorkspaceApi } from '../AdminShell';

export function errorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401)
      return 'Sua sessão expirou. Entre novamente para continuar.';
    if (error.response?.status === 403)
      return (
        error.response.data?.message ||
        'Você não possui permissão para esta operação.'
      );
    return (
      error.response?.data?.message ||
      'Não foi possível acessar a API. Verifique sua conexão e tente novamente.'
    );
  }
  return error instanceof Error
    ? error.message
    : 'Não foi possível concluir a operação.';
}

export async function loadOptions(client: AxiosInstance, endpoint: string) {
  const rows: Row[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const response = await client.get(endpoint, {
      params: { page, limit: 100 },
    });
    rows.push(...response.data.data.data);
    totalPages = response.data.data.pagination.totalPages;
    page++;
  } while (page <= totalPages);
  return rows;
}

export function Notice({
  error,
  message,
}: {
  error?: string;
  message?: string;
}) {
  if (!error && !message) return null;
  return (
    <div
      role={error ? 'alert' : 'status'}
      className={`rounded-lg border p-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}
    >
      {error || message}
    </div>
  );
}

export function PageHeading({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}

export function DataTable({
  rows,
  columns,
  actions,
  footer,
}: {
  rows: Row[];
  // Terceiro item opcional da coluna define o alinhamento ('right' p/ valores).
  columns: [string, string, ('left' | 'right')?][];
  actions?: (row: Row) => React.ReactNode;
  // Rodapé opcional da tabela (ex.: linha de total nos detalhes da venda).
  footer?: React.ReactNode;
}) {
  if (!rows.length)
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <p className="font-semibold text-slate-800">
          Nenhum registro encontrado
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Revise os filtros ou cadastre o primeiro registro para começar.
        </p>
      </div>
    );
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {columns.map(([key, label, align]) => (
              <th
                key={key}
                className={`whitespace-nowrap px-4 py-3 font-semibold ${align === 'right' ? 'text-right' : ''}`}
              >
                {label}
              </th>
            ))}
            {actions && (
              <th className="w-px whitespace-nowrap px-4 py-3 text-right">
                Ações
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <tr key={String(row._id || index)} className="hover:bg-slate-50">
              {columns.map(([key, , align]) => (
                <td
                  key={key}
                  className={`max-w-xs px-4 py-4 text-slate-700 ${align === 'right' ? 'text-right' : ''}`}
                >
                  <span
                    className={
                      ['status', 'isActive'].includes(key)
                        ? 'inline-block rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium'
                        : ''
                    }
                  >
                    {display(getValue(row, key), key)}
                  </span>
                </td>
              ))}
              {actions && (
                <td className="w-px whitespace-nowrap px-4 py-3">
                  <div className="flex flex-wrap justify-end gap-x-4 gap-y-2">
                    {actions(row)}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
        {footer}
      </table>
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
    const element = dialog.current;
    return () => {
      element?.close();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="modal-scroll m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-2xl p-0 shadow-xl backdrop:bg-slate-950/50"
      aria-label={title}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-5">
        <h2 className="text-lg font-semibold">{title}</h2>
        <button
          onClick={onClose}
          className="admin-secondary"
          aria-label="Fechar janela"
        >
          ×
        </button>
      </div>
      <div className="p-5">{children}</div>
    </dialog>
  );
}

// Validação de um campo individual — mesma regra aplicada pelo backend
// (regra 2 do AGENTS.md): formato de email, documento, telefone, CEP, cor,
// número e vencimento não passado. Compartilhada entre RecordForm e
// EditableDetails para os dois lados validarem igual.
export const validateFieldValue = (
  field: Field,
  raw: string,
  values: Record<string, string>
): string | null => {
  if (field.required && !raw) return `Preencha ${field.label}.`;
  if (!raw) return null;
  if (field.type === 'password' && raw.length < 6)
    return 'A senha deve ter no mínimo 6 caracteres.';
  if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw))
    return 'Email inválido.';
  if (
    field.type === 'number' &&
    (!Number.isFinite(Number(raw)) || Number(raw) < (field.min ?? -Infinity))
  )
    return `Valor inválido para ${field.label}.`;
  if (field.key === 'phone' && !/^\d{10,11}$/.test(raw.replace(/\D/g, '')))
    return 'Telefone deve conter 10 ou 11 dígitos.';
  if (field.key.endsWith('zipCode') && !/^\d{5}-?\d{3}$/.test(raw))
    return 'CEP inválido.';
  if (
    ['cpf', 'document'].includes(field.key) &&
    !validDocument(raw, field.key === 'cpf' ? 'cpf' : values.documentType)
  )
    return 'CPF/CNPJ inválido.';
  if (field.key.startsWith('colors.') && !/^#[0-9a-f]{6}$/i.test(raw))
    return 'Cor inválida. Utilize # seguido de seis dígitos hexadecimais.';
  // Vencimento não pode ser no passado — compara só a data, como o backend.
  if (
    field.key === 'dueDate' &&
    field.type === 'date' &&
    raw < new Date().toISOString().slice(0, 10)
  )
    return 'Vencimento não pode ser no passado.';
  return null;
};

function validDocument(value: string, type: string) {
  const digits = value.replace(/\D/g, '');
  if (
    !['cpf', 'cnpj'].includes(type) ||
    digits.length !== (type === 'cpf' ? 11 : 14) ||
    /^(\d)\1+$/.test(digits)
  )
    return false;
  const baseLength = digits.length - 2;
  for (let extra = 0; extra < 2; extra++) {
    const length = baseLength + extra;
    let sum = 0;
    for (let index = 0; index < length; index++)
      sum +=
        Number(digits[index]) *
        (type === 'cpf' ? length + 1 - index : ((length - 1 - index) % 8) + 2);
    const remainder = sum % 11;
    const check = remainder < 2 ? 0 : 11 - remainder;
    if (Number(digits[length]) !== check) return false;
  }
  return true;
}

export function RecordForm({
  fields,
  initial = {},
  editing = false,
  onSubmit,
  onCancel,
  submitLabel = 'Salvar',
}: {
  fields: Field[];
  initial?: Row;
  editing?: boolean;
  onSubmit: (payload: Row) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const { client } = useWorkspaceApi();
  // Campos que entram na validação/payload: hidden (ex.: documentType) fica
  // fora do render, mas o valor continua sendo enviado ao backend.
  const submittable = fields.filter(
    (field) =>
      !field.readOnly &&
      (editing ? !field.createOnly : !field.editOnly)
  );
  const visible = submittable.filter((field) => !field.hidden);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      fields.map((field) => {
        let value = getValue(initial, field.key);
        if (value && typeof value === 'object') value = (value as Row)._id;
        if (field.type === 'date' && value) value = String(value).slice(0, 10);
        return [
          field.key,
          value == null
            ? field.key === 'isActive'
              ? 'true'
              : field.key === 'documentType'
                ? 'cpf'
                : ''
            : String(value),
        ];
      })
    )
  );
  const [options, setOptions] = useState<Record<string, Row[]>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const sources = [
    ...new Set(fields.flatMap((field) => (field.source ? [field.source] : []))),
  ].join('|');
  useEffect(() => {
    if (!sources) return;
    let active = true;
    const load = async () => {
      setLoadingOptions(true);
      try {
        const entries = await Promise.all(
          sources
            .split('|')
            .map(
              async (source) =>
                [source, await loadOptions(client, source)] as const
            )
        );
        if (active) setOptions(Object.fromEntries(entries));
      } catch (cause) {
        if (active) setError(errorMessage(cause));
      } finally {
        if (active) setLoadingOptions(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [sources, client]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const payload: Row = {};
    try {
      for (const field of submittable) {
        const raw = (values[field.key] || '').trim();
        const invalid = validateFieldValue(field, raw, values);
        if (invalid) throw new Error(invalid);
        if (!raw && !editing && !field.required) continue;
        const value: unknown =
          field.key === 'isActive'
            ? raw === 'true'
            : field.type === 'number'
              ? raw
                ? Number(raw)
                : undefined
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
      if (payload.type === 'out' && payload.productId) {
        const product = options['/products']?.find(
          (row) => row._id === payload.productId
        );
        if (
          product &&
          Number(payload.quantity) > Number(product.quantityInStock)
        )
          throw new Error('Estoque insuficiente para a saída.');
      }
      setBusy(true);
      await onSubmit(payload);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="space-y-5">
      <Notice error={error} />
      {loadingOptions && (
        <p role="status" className="text-sm text-slate-500">
          Carregando opções...
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {visible.map((field) => (
          <div key={field.key}>
            <label className="admin-label" htmlFor={`field-${field.key}`}>
              {field.label}
              {field.required ? ' *' : ''}
            </label>
            {field.options || field.source ? (
              <select
                id={`field-${field.key}`}
                className="admin-input"
                required={field.required}
                value={values[field.key]}
                onChange={(event) =>
                  setValues({ ...values, [field.key]: event.target.value })
                }
              >
                <option value="">Selecione</option>
                {(
                  field.options ||
                  (options[field.source || ''] || []).map((row) => [
                    String(row._id),
                    String(row.name || row._id),
                  ])
                ).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            ) : field.key === 'document' ? (
              // Input de documento com botão que alterna CPF/CNPJ: o tipo
              // muda a máscara aplicada e a validação feita no submit.
              <div className="flex items-stretch gap-2">
                <input
                  id={`field-${field.key}`}
                  className="admin-input flex-1"
                  type="text"
                  required={field.required}
                  value={values[field.key]}
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
                      documentType:
                        values.documentType === 'cnpj' ? 'cpf' : 'cnpj',
                      document: '',
                    })
                  }
                >
                  {values.documentType === 'cnpj' ? 'CNPJ' : 'CPF'}
                </button>
              </div>
            ) : (
              <input
                id={`field-${field.key}`}
                className={`admin-input ${field.disabled ? 'cursor-not-allowed bg-slate-100 text-slate-500' : ''}`}
                type={field.type || 'text'}
                disabled={field.disabled}
                min={field.min}
                maxLength={field.maxLength}
                minLength={field.type === 'password' ? 6 : undefined}
                step={field.type === 'number' ? 'any' : undefined}
                required={field.required}
                value={values[field.key]}
                onChange={(event) =>
                  setValues({ ...values, [field.key]: event.target.value })
                }
                autoComplete={
                  field.type === 'password' ? 'new-password' : undefined
                }
              />
            )}
            {field.hint && (
              <p className="mt-1 text-xs text-slate-400">{field.hint}</p>
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="admin-secondary"
          >
            Voltar
          </button>
        )}
        <button disabled={busy || loadingOptions} className="admin-primary">
          {busy ? 'Salvando...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
