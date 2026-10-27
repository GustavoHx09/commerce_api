'use client';

import { useMemo, useState } from 'react';
import { useWorkspaceApi } from '../../AdminShell';
import PermissionChecklist from './PermissionChecklist';
import {
  DEFAULT_ROLE_PERMISSIONS,
  computeEffectivePermissions,
} from '@/lib/permissions';
import type { PanelUser, PermissionPreset } from '../types';

interface UserPermissionsEditorProps {
  user: PanelUser;
  presets: PermissionPreset[];
  catalog: string[];
  onSaved: () => void;
}

// Editor de permissões de um usuário: vínculo a preset, concessões extras e
// revogações individuais. O backend valida tudo novamente no PUT /users/:id.
export default function UserPermissionsEditor({
  user,
  presets,
  catalog,
  onSaved,
}: UserPermissionsEditorProps) {
  const { client: api } = useWorkspaceApi();
  // O estado inicial vem do usuário recebido; o componente é montado com
  // key={user._id} na página, então trocar de usuário recria o estado.
  const [presetId, setPresetId] = useState<string>(
    user.permissionPresetId || ''
  );
  // Sem preset, o campo permissions funciona como base legada no backend;
  // no painel ele é tratado como ajuste manual e só faz sentido com preset.
  const [extras, setExtras] = useState<Set<string>>(
    new Set(user.permissionPresetId ? user.permissions : [])
  );
  const [revoked, setRevoked] = useState<Set<string>>(
    new Set(user.revokedPermissions || [])
  );
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const selectedPreset = useMemo(
    () => presets.find((p) => p._id === presetId) || null,
    [presets, presetId]
  );

  // Base = permissões do preset vinculado ou o padrão do cargo.
  const base = useMemo(
    () =>
      selectedPreset?.permissions ?? DEFAULT_ROLE_PERMISSIONS[user.role] ?? [],
    [selectedPreset, user.role]
  );

  const effective = useMemo(
    () =>
      computeEffectivePermissions(
        base,
        Array.from(extras),
        Array.from(revoked)
      ),
    [base, extras, revoked]
  );

  // Origem exibida no selo ao lado de cada permissão.
  const getOrigin = (permission: string): 'extra' | 'revogada' | null => {
    if (extras.has(permission)) return 'extra';
    if (revoked.has(permission)) return 'revogada';
    return null;
  };

  // Marcando fora da base vira extra; desmarcando algo da base vira revogação.
  const handleToggle = (permission: string, next: boolean) => {
    const inBase = base.includes(permission);

    setExtras((prev) => {
      const nextSet = new Set(prev);
      if (!inBase) {
        next ? nextSet.add(permission) : nextSet.delete(permission);
      }
      return nextSet;
    });

    setRevoked((prev) => {
      const nextSet = new Set(prev);
      if (inBase) {
        next ? nextSet.delete(permission) : nextSet.add(permission);
      }
      return nextSet;
    });
  };

  const handleSave = async () => {
    setError('');
    setIsSaving(true);

    try {
      await api.put(`/users/${user._id}`, {
        permissionPresetId: presetId || null,
        permissions: presetId ? Array.from(extras) : user.permissions,
        revokedPermissions: Array.from(revoked),
      });
      onSaved();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(message || 'Não foi possível salvar as permissões.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="rounded-xl bg-white p-6 shadow">
      <h2 className="mb-4 text-xl font-bold text-gray-900">
        Permissões de {user.name}
      </h2>
      <p className="mb-4 text-sm text-gray-500">
        {user.email} · cargo: <span className="font-medium">{user.role}</span>
      </p>

      <div className="mb-6">
        <label
          htmlFor="preset"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Preset vinculado
        </label>
        <select
          id="preset"
          value={presetId}
          onChange={(e) => setPresetId(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Sem preset (usa permissões do cargo)</option>
          {presets
            .filter((p) => p.isActive)
            .map((preset) => (
              <option key={preset._id} value={preset._id}>
                {preset.name}
                {preset.tenantId === null ? ' (global)' : ''}
              </option>
            ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Ajustes marcados como &quot;extra&quot; são adicionados sobre a base;
          desmarcar uma permissão herdada a registra como revogada.
        </p>
      </div>

      <PermissionChecklist
        catalog={catalog}
        checked={effective}
        getOrigin={getOrigin}
        onToggle={handleToggle}
      />

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="mt-6 rounded-md bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700 disabled:opacity-50"
      >
        {isSaving ? 'Salvando...' : 'Salvar permissões'}
      </button>
    </section>
  );
}
