'use client';

import { useState } from 'react';
import api from '@/lib/api';
import PresetForm from './PresetForm';
import type { PermissionPreset, PanelUser } from '../types';

interface PresetListProps {
  presets: PermissionPreset[];
  users: PanelUser[];
  catalog: string[];
  canWrite: boolean;
  // Role do usuário logado: apenas master gerencia presets globais.
  userRole: string;
  onChanged: () => void;
}

// Lista os presets (globais + do tenant) com ações de criar, editar,
// ativar/desativar e remover. Globais são somente leitura para não-masters.
export default function PresetList({
  presets,
  users,
  catalog,
  canWrite,
  userRole,
  onChanged,
}: PresetListProps) {
  const [editing, setEditing] = useState<PermissionPreset | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const linkedUsersCount = (presetId: string) =>
    users.filter((u) => u.permissionPresetId === presetId).length;

  const handleDelete = async (preset: PermissionPreset) => {
    const linked = linkedUsersCount(preset._id);
    const warning = linked > 0
      ? ` Este preset está vinculado a ${linked} usuário(s), que passarão a usar as permissões do cargo.`
      : '';

    if (!window.confirm(`Remover o preset "${preset.name}"?${warning}`)) return;

    try {
      await api.delete(`/permission-presets/${preset._id}`);
      onChanged();
    } catch {
      setError('Não foi possível remover o preset.');
    }
  };

  const handleToggleActive = async (preset: PermissionPreset) => {
    try {
      await api.put(`/permission-presets/${preset._id}`, { isActive: !preset.isActive });
      onChanged();
    } catch {
      setError('Não foi possível atualizar o preset.');
    }
  };

  return (
    <section className="rounded-xl bg-white p-6 shadow">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Presets de permissões</h2>
        {canWrite && (
          <button
            onClick={() => setCreating(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
          >
            Novo preset
          </button>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {presets.length === 0 ? (
        <p className="text-gray-600">Nenhum preset cadastrado.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {presets.map((preset) => {
            const linked = linkedUsersCount(preset._id);
            const isGlobal = preset.tenantId === null;

            return (
              <li key={preset._id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-gray-900">
                    {preset.name}
                    {isGlobal && (
                      <span className="ml-2 rounded bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-700">
                        global
                      </span>
                    )}
                    {!preset.isActive && (
                      <span className="ml-2 rounded bg-gray-200 px-1.5 py-0.5 text-xs font-medium text-gray-600">
                        inativo
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-500">
                    {preset.description || 'Sem descrição'} · {preset.permissions.length} permissão(ões)
                    {linked > 0 && ` · ${linked} usuário(s) vinculado(s)`}
                  </p>
                </div>

                {canWrite && (!isGlobal || userRole === 'master') && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditing(preset)}
                      className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 transition hover:bg-gray-50"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleToggleActive(preset)}
                      className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 transition hover:bg-gray-50"
                    >
                      {preset.isActive ? 'Desativar' : 'Ativar'}
                    </button>
                    <button
                      onClick={() => handleDelete(preset)}
                      className="rounded-md border border-red-300 px-3 py-1 text-sm text-red-600 transition hover:bg-red-50"
                    >
                      Remover
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {(creating || editing) && (
        <PresetForm
          preset={editing}
          catalog={catalog}
          affectedUsers={editing ? linkedUsersCount(editing._id) : 0}
          onClose={(saved) => {
            setCreating(false);
            setEditing(null);
            if (saved) onChanged();
          }}
        />
      )}
    </section>
  );
}
