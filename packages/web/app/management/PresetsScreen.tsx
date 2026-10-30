'use client';

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import Link from 'next/link';
import { useWorkspaceApi } from '../AdminShell';
import { useAuth } from '../context/AuthContext';
import { display, type Row } from './config';
import { hasPermission } from '@/lib/permissions';
import {
  errorMessage,
  loadOptions,
  Notice,
  PageHeading,
  DataTable,
  Modal,
} from './ui';
import PresetForm from '../permissions/components/PresetForm';
import type { PanelUser, PermissionPreset } from '../permissions/types';

const detailBoxClass =
  'rounded-lg border border-slate-200 bg-slate-50 px-4 py-3';
const detailLabelClass =
  'text-xs font-medium uppercase tracking-wide text-slate-500';
const detailValueClass = 'mt-1 font-medium text-slate-900';
// Mesmo estilo dos botões de ação da tabela nas demais telas.
const actionButtonClass =
  'inline-flex items-center rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200';

// Tela de predefinições de permissões no mesmo padrão das demais telas de
// gerenciamento: busca + filtro de situação, "Nova predefinição" e tabela
// com as colunas do preset (usuários vinculados, permissões, descrição).
export default function PresetsScreen() {
  const { client, tenantId } = useWorkspaceApi();
  const { user } = useAuth();
  const [presets, setPresets] = useState<PermissionPreset[]>([]);
  const [users, setUsers] = useState<PanelUser[]>([]);
  const [catalog, setCatalog] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('');
  const [applied, setApplied] = useState({ search: '', view: '' });
  const [details, setDetails] = useState<PermissionPreset | null>(null);
  const [editor, setEditor] = useState<{
    preset: PermissionPreset | null;
    creating: boolean;
  } | null>(null);

  // Gerenciar presets exige permissionPresets:write nas permissões
  // efetivas — master continua vendo tudo.
  const canManage =
    user?.role === 'master' ||
    hasPermission(user?.permissions, 'permissionPresets:write');

  const load = useCallback(async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [usersRes, presetsRes, catalogRes] = await Promise.all([
        loadOptions(client, '/users'),
        loadOptions(client, '/permission-presets'),
        client.get('/permission-presets/available-permissions'),
      ]);
      setUsers(usersRes as unknown as PanelUser[]);
      // Presets globais (sem tenant) valem para todos; os demais só do tenant.
      setPresets(
        (presetsRes as unknown as PermissionPreset[]).filter(
          (preset) => !preset.tenantId || preset.tenantId === tenantId
        )
      );
      setCatalog(catalogRes.data.data.permissions);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [client, tenantId]);

  // startTransition evita setState síncrono no corpo do effect (o load
  // seta loading/erro assim que inicia).
  useEffect(() => {
    startTransition(() => {
      void load();
    });
  }, [load]);

  const linkedUsers = useCallback(
    (presetId: string) =>
      users.filter((u) => u.permissionPresetId === presetId).length,
    [users]
  );

  // Filtra por texto (nome/descrição) e situação, no mesmo padrão das telas,
  // e enriquece cada linha com os contadores exibidos nas colunas.
  const rows = useMemo(() => {
    const term = applied.search.trim().toLowerCase();
    return presets
      .filter((preset) => {
        if (applied.view === 'inactive') return preset.isActive === false;
        if (applied.view === 'all') return true;
        return preset.isActive !== false;
      })
      .filter(
        (preset) =>
          !term ||
          preset.name.toLowerCase().includes(term) ||
          (preset.description || '').toLowerCase().includes(term)
      )
      .map((preset) => ({
        ...preset,
        permissionsCount: preset.permissions.length,
        linkedCount: linkedUsers(preset._id),
      }));
  }, [presets, applied, linkedUsers]);

  const toggleActive = async (preset: PermissionPreset) => {
    try {
      await client.put(`/permission-presets/${preset._id}`, {
        isActive: !preset.isActive,
      });
      // Se o modal de detalhes estiver aberto neste preset, atualiza a
      // situação exibida junto com a lista.
      setDetails((current) =>
        current && current._id === preset._id
          ? { ...current, isActive: !preset.isActive }
          : current
      );
      await load();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  };

  const remove = async (preset: PermissionPreset) => {
    const linked = linkedUsers(preset._id);
    const warning = linked
      ? ` Este preset está vinculado a ${linked} usuário(s), que passarão a usar as permissões do cargo.`
      : '';
    if (!window.confirm(`Remover o preset "${preset.name}"?${warning}`))
      return;
    try {
      await client.delete(`/permission-presets/${preset._id}`);
      await load();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  };

  return (
    <main className="mx-auto max-w-screen-2xl p-4 sm:p-8">
      <PageHeading
        title="Permissões"
        description="Predefinições de permissão: grupos reutilizáveis que agilizam o controle de acesso da equipe."
      >
        <div className="flex gap-2">
          <Link href="/management/users" className="admin-secondary">
            Gerenciar funcionários
          </Link>
          {canManage && (
            <button
              className="admin-primary"
              disabled={!tenantId}
              onClick={() => setEditor({ preset: null, creating: true })}
            >
              Nova predefinição
            </button>
          )}
        </div>
      </PageHeading>
      <Notice error={error} />
      {!tenantId ? (
        <Notice message="Selecione uma empresa no cabeçalho para gerenciar as permissões." />
      ) : !canManage ? (
        <Notice error="Apenas administradores gerenciam permissões." />
      ) : (
        // Mesmo espaçamento da ResourceScreen (space-y-4) entre formulário,
        // linha de contagem e tabela.
        <div className="space-y-4">
          <form
            className="admin-panel flex flex-wrap items-end gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              setApplied({ search: search.trim(), view });
            }}
          >
            <div className="min-w-48 flex-1">
              <label htmlFor="search" className="admin-label">
                Pesquisar
              </label>
              <input
                id="search"
                className="admin-input"
                placeholder="Digite para pesquisar"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="filter-view" className="admin-label">
                Filtros de busca
              </label>
              <select
                id="filter-view"
                className="admin-input"
                value={view}
                onChange={(event) => setView(event.target.value)}
              >
                <option value="">Ativos</option>
                <option value="inactive">Inativos</option>
                <option value="all">Todos</option>
              </select>
            </div>
            <button className="admin-primary">Buscar</button>
            <button
              type="button"
              className="admin-secondary"
              onClick={() => {
                setSearch('');
                setView('');
                setApplied({ search: '', view: '' });
              }}
            >
              Limpar
            </button>
          </form>

          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>{rows.length} registro(s)</span>
            <button
              className="admin-secondary"
              disabled={loading}
              onClick={() => void load()}
            >
              Atualizar
            </button>
          </div>

          {loading ? (
            <p role="status">Carregando predefinições...</p>
          ) : (
            <DataTable
              rows={rows as unknown as Row[]}
              columns={[
                ['name', 'Predefinição'],
                ['description', 'Descrição'],
                ['permissionsCount', 'Permissões'],
                ['linkedCount', 'Usuários'],
              ]}
              actions={(row) => (
                <button
                  className={actionButtonClass}
                  onClick={() =>
                    setDetails(row as unknown as PermissionPreset)
                  }
                >
                  Detalhes
                </button>
              )}
            />
          )}
        </div>
      )}
      {/* Detalhes da predefinição: campos em lista (Campo | Valor), as
          permissões agrupadas e as ações dentro do modal — padrão das telas. */}
      {details && (
        <Modal
          title={`Detalhes · ${details.name}`}
          onClose={() => setDetails(null)}
        >
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className={detailBoxClass}>
              <dt className={detailLabelClass}>Situação</dt>
              <dd className={detailValueClass}>
                {details.isActive ? 'Ativo' : 'Inativo'}
              </dd>
            </div>
            <div className={detailBoxClass}>
              <dt className={detailLabelClass}>Usuários vinculados</dt>
              <dd className={detailValueClass}>{linkedUsers(details._id)}</dd>
            </div>
          </dl>
          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr className="divide-x divide-slate-200">
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-slate-500">
                    Campo
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-slate-500">
                    Valor
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  ['Nome', display(details.name)],
                  [
                    'Descrição',
                    display(details.description) || 'Sem descrição',
                  ],
                  [
                    'Permissões',
                    `${details.permissions.length} permissão(ões)`,
                  ],
                ].map(([label, value]) => (
                  <tr key={label} className="divide-x divide-slate-100">
                    <td className="px-4 py-2.5 text-sm font-medium text-slate-600">
                      {label}
                    </td>
                    <td className="px-4 py-2.5 text-sm font-medium text-slate-900">
                      {value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5 flex flex-wrap justify-end gap-3">
            {canManage &&
              (details.tenantId !== null || user?.role === 'master') && (
                <>
                  <button
                    className="admin-secondary"
                    onClick={() => void toggleActive(details)}
                  >
                    {details.isActive ? 'Desativar' : 'Ativar'}
                  </button>
                  <button
                    className="admin-secondary text-red-600"
                    onClick={() => {
                      setDetails(null);
                      void remove(details);
                    }}
                  >
                    Remover
                  </button>
                  <button
                    className="admin-primary"
                    onClick={() => {
                      setEditor({ preset: details, creating: false });
                      setDetails(null);
                    }}
                  >
                    Editar
                  </button>
                </>
              )}
          </div>
        </Modal>
      )}
      {editor && (
        <PresetForm
          preset={editor.preset}
          catalog={catalog}
          affectedUsers={
            editor.preset ? linkedUsers(editor.preset._id) : 0
          }
          onClose={(saved) => {
            setEditor(null);
            if (saved) void load();
          }}
        />
      )}
    </main>
  );
}
