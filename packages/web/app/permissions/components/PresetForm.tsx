'use client';

import { useMemo, useState } from 'react';
import api from '@/lib/api';
import PermissionChecklist from './PermissionChecklist';
import type { PermissionPreset } from '../types';

interface PresetFormProps {
  preset: PermissionPreset | null;
  catalog: string[];
  // Quantidade de usuários vinculados ao preset em edição (aviso de propagação).
  affectedUsers: number;
  onClose: (saved: boolean) => void;
}

// Modal de criação/edição de preset de permissões com o catálogo em checkboxes.
export default function PresetForm({
  preset,
  catalog,
  affectedUsers,
  onClose,
}: PresetFormProps) {
  const [name, setName] = useState(preset?.name || '');
  const [description, setDescription] = useState(preset?.description || '');
  const [isActive, setIsActive] = useState(preset?.isActive ?? true);
  const [selected, setSelected] = useState<Set<string>>(
    new Set(preset?.permissions || []),
  );
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = !!preset;

  const handleToggle = (permission: string, next: boolean) => {
    setSelected((prev) => {
      const nextSet = new Set(prev);
      next ? nextSet.add(permission) : nextSet.delete(permission);
      return nextSet;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('O nome do preset é obrigatório.');
      return;
    }

    if (selected.size === 0) {
      setError('Selecione pelo menos uma permissão.');
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        permissions: Array.from(selected),
        isActive,
      };

      if (isEditing) {
        await api.put(`/permission-presets/${preset._id}`, payload);
      } else {
        await api.post('/permission-presets', payload);
      }

      onClose(true);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || 'Não foi possível salvar o preset.');
      setIsSaving(false);
    }
  };

  const hasChangesToPermissions = useMemo(() => {
    if (!isEditing) return false;
    const before = new Set(preset.permissions);
    if (before.size !== selected.size) return true;
    return Array.from(selected).some((p) => !before.has(p));
  }, [isEditing, preset, selected]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-xl font-bold text-gray-900">
          {isEditing ? `Editar preset: ${preset.name}` : 'Novo preset'}
        </h2>

        {isEditing && affectedUsers > 0 && hasChangesToPermissions && (
          <p className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            Atenção: este preset está vinculado a {affectedUsers} usuário(s).
            As alterações serão propagadas automaticamente para todos eles.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="preset-name" className="mb-1 block text-sm font-medium text-gray-700">
              Nome
            </label>
            <input
              id="preset-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="preset-description" className="mb-1 block text-sm font-medium text-gray-700">
              Descrição
            </label>
            <input
              id="preset-description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Preset ativo
          </label>

          <PermissionChecklist
            catalog={catalog}
            checked={selected}
            onToggle={handleToggle}
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => onClose(false)}
              className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 transition hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-md bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? 'Salvando...' : 'Salvar preset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
